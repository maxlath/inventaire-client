// One unique Entity model to rule them all
// but with specific initializers:
// - By source:
//   - Wikidata entities have specific initializers related to Wikimedia sitelinks
// - By type: see specialInitializersByType
import { noop, identity } from 'underscore'
import app from '#app/app'
import { serverReportError } from '#app/lib/error'
import { normalizeIsbn } from '#app/lib/isbn'
import log_ from '#app/lib/loggers'
import { props as promiseProps } from '#app/lib/promises'
import getBestLangValue from '#entities/lib/get_best_lang_value'
import getOriginalLang from '#entities/lib/get_original_lang'
import Filterable from '#general/models/filterable'
import { I18n } from '#user/lib/i18n'
import { getReverseClaims } from '../lib/entities.ts'
import editableEntity from '../lib/inv/editable_entity.ts'
import initializeInvEntity from '../lib/inv/init_entity.ts'
import initAuthor from '../lib/types/author.ts'
import initCollection from '../lib/types/collection.ts'
import initEdition from '../lib/types/edition.ts'
import initPublisher from '../lib/types/publisher.ts'
import initSerie from '../lib/types/serie.ts'
import initWork from '../lib/types/work.ts'
import initializeWikidataEntity from '../lib/wikidata/init_entity.ts'

const specialInitializersByType = {
  human: initAuthor,
  serie: initSerie,
  work: initWork,
  edition: initEdition,
  publisher: initPublisher,
  collection: initCollection,
}

const editableTypes = Object.keys(specialInitializersByType)

const placeholdersTypes = [ 'meta', 'missing' ]

export default Filterable.extend({
  initialize (attrs, options) {
    this.refresh = options?.refresh
    this.type = attrs.type || options.defaultType

    if (this.type != null) {
      this.pluralizedType = this.type + 's'
    }

    if (placeholdersTypes.includes(this.type)) {
      // Set placeholder attributes so that the logic hereafter doesn't crash
      Object.assign(attrs, placeholderAttributes)
      this.set(placeholderAttributes)
    }

    this.setCommonAttributes(attrs)
    // Keep label updated
    this.on('change:labels', () => this.setFavoriteLabel(this.toJSON()))

    // List of promises created from specialized initializers
    // to wait for before triggering @executeMetadataUpdate (see below)
    this._dataPromises = []

    if (this.wikidataId) {
      initializeWikidataEntity.call(this)
    } else {
      initializeInvEntity.call(this, attrs)
    }

    if (editableTypes.includes(this.type)) {
      const pathname = this.get('pathname')
      this.set({
        edit: `${pathname}/edit`,
        cleanup: `${pathname}/cleanup`,
      })
    }

    // If the entity isn't of any known type, it was probably fetched
    // for its label, there is thus no need to go further on initialization
    // as what follows is specific to core entities types
    // Or, it was fetched for its relation with an other entity but misses
    // the proper P31 data to display correctly. Then, when fetching the entity
    // a defaultType should be passed as option.
    // For instance, parts of a serie will default have a defaultType='work'
    if (!this.type) {
      // Placeholder
      this.waitForData = Promise.resolve()
      return
    }

    if (this.get('edit') != null) Object.assign(this, editableEntity)

    // An object to store only the ids of such a relationship
    // ex: this entity is a P50 of entities Q...
    // /!\ Legacy: to be harmonized/merged with @subentities
    this.set('reverseClaims', {})

    this.typeSpecificInit()

    if (this._dataPromises.length === 0) {
      this.waitForData = Promise.resolve()
    } else {
      this.waitForData = Promise.all(this._dataPromises)
    }
  },

  typeSpecificInit () {
    const specialInitializer = specialInitializersByType[this.type]
    if (specialInitializer != null) return specialInitializer.call(this)
  },

  setCommonAttributes (attrs) {
    let pathname
    if (attrs.claims == null) {
      serverReportError('entity without claims', { attrs })
      attrs.claims = {}
    }

    let { uri, type } = attrs
    const [ prefix, id ] = uri.split(':')

    if (prefix === 'wd') this.wikidataId = id

    const isbn13h = attrs.claims['wdt:P212']?.[0]
    // Using de-hyphenated ISBNs for URIs
    if (isbn13h != null) this.isbn = normalizeIsbn(isbn13h)

    if (prefix !== 'inv') this.setInvAltUri()

    if (type == null) type = 'subject'
    this.defaultClaimProperty = defaultClaimPropertyByType[type]

    if (this.defaultClaimProperty != null) {
      pathname = `/entity/${this.defaultClaimProperty}-${uri}`
    } else {
      pathname = `/entity/${uri}`
    }

    this.set({ type, prefix, pathname })
    this.setFavoriteLabel(attrs)
  },

  // Not naming it 'setLabel' as it collides with editable_entity own 'setLabel'
  setFavoriteLabel (attrs) {
    this.originalLang = getOriginalLang(attrs.claims)
    const { value, lang } = getBestLangValue(app.user.lang, this.originalLang, attrs.labels)
    this.set('label', value)
    this.set('labelLang', lang || '')
  },

  setInvAltUri () {
    const invId = this.get('_id')
    if (invId) this.set('altUri', `inv:${invId}`)
  },

  async fetchSubEntities (refresh) {
    refresh = this.getRefresh(refresh)
    if (!refresh && this.waitForSubentities != null) return this.waitForSubentities

    if (this.subentitiesName == null) {
      this.waitForSubentities = Promise.resolve()
      return this.waitForSubentities
    }

    const collection = this[this.subentitiesName] = new Backbone.Collection()

    const uri = this.get('uri')

    // Known case: when called on an instance of entity_draft_model
    if (uri == null) {
      this.waitForSubentities = Promise.resolve()
      return this.waitForSubentities
    }

    this.waitForSubentities = this.fetchSubEntitiesUris()
      .then(uris => app.request('get:entities:models', { uris, refresh }))
      .then(this.beforeSubEntitiesAdd.bind(this))
      .then(collection.add.bind(collection))

    const subentities = await this.waitForSubentities
    this.afterSubEntitiesAdd()
    return subentities
  },

  async fetchSubEntitiesUris (refresh) {
    refresh = this.getRefresh(refresh)
    if (!refresh && this.waitForSubentitiesUris != null) return this.waitForSubentitiesUris

    // A draft entity can't already have subentities
    if (this.creating) {
      this.waitForSubentities = Promise.resolve()
      return
    }

    const uri = this.get('uri')
    const prop = this.childrenClaimProperty

    this.waitForSubentitiesUris = getReverseClaims(prop, uri, refresh)
      .then(uris => {
        this.setSubEntitiesUris(uris)
        return uris
      })

    return this.waitForSubentitiesUris
  },

  // Override in sub-types
  beforeSubEntitiesAdd: identity,
  afterSubEntitiesAdd: noop,

  setSubEntitiesUris (uris) {
    this.set('subEntitiesUris', uris)
    if (this.subEntitiesInverseProperty) {
      this.set(`claims.${this.subEntitiesInverseProperty}`, uris)
    }
    // The list of all uris that describe an entity that is this work or a subentity,
    // that is, an edition of this work
    this.set('allUris', [ this.get('uri') ].concat(uris))
  },

  // To be called by a view onRender:
  // updates the document with the entities data
  updateMetadata () {
    return this.waitForData
    .then(this.executeMetadataUpdate.bind(this))
    .catch(log_.Error('updateMetadata err'))
  },

  executeMetadataUpdate () {
    return promiseProps({
      title: this.buildTitle(),
      description: this.findBestDescription()?.slice(0, 501),
      image: this.getImageSrcAsync(),
      url: this.get('pathname'),
      smallCardType: true,
    })
  },

  findBestDescription () {
    // So far, only Wikidata entities get extracts
    const [ extract, description ] = this.gets('extract', 'description')
    // Dont use an extract too short as it will be
    // more of it's wikipedia source url than a description
    if (extract?.length > 300) {
      return extract
    } else {
      return description || extract
    }
  },

  // Override in with type-specific methods
  buildTitle () {
    const label = this.get('label')
    const type = this.get('type')
    const P31 = this.get('claims.wdt:P31.0')
    const typeLabel = I18n(typesString[P31] || type)
    return `${label} - ${typeLabel}`
  },

  async getImageAsync () { return this.get('image') },
  async getImageSrcAsync () {
    const imageObj = await this.getImageAsync()
    // Let app/lib/metadata/apply_transformers format the URL with API.img
    return imageObj?.url
  },

  getRefresh (refresh) {
    refresh = refresh || this.refresh || this.graphChanged
    // No need to force refresh until next graph change
    this.graphChanged = false
    return refresh
  },

  matchable () {
    const { lang } = app.user
    const userLangAliases = this.get(`aliases.${lang}`) || []
    return [ this.get('label') ].concat(userLangAliases)
  },

  // Overriden by modules/entities/lib/wikidata/init_entity.js
  // for Wikidata entities
  async getWikipediaExtract () {},
})

const placeholderAttributes = {
  labels: {},
  aliases: {},
  descriptions: {},
  claims: {},
  sitelinks: {},
}

export const defaultClaimPropertyByType = {
  movement: 'wdt:P135',
  genre: 'wdt:P136',
  subject: 'wdt:P921',
}

export const typesString = {
  'wd:Q5': 'author',
  // works
  'wd:Q571': 'book',
  'wd:Q47461344': 'book',
  'wd:Q1004': 'comic book',
  'wd:Q8274': 'manga',
  'wd:Q49084': 'short story',
  // series
  'wd:Q277759': 'book series',
  'wd:Q14406742': 'comic book series',
  'wd:Q21198342': 'manga series',
}
