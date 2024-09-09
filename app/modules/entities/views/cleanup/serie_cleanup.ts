import { range } from 'underscore'
import app from '#app/app'
import { capitalize, lazyMethod } from '#app/lib/utils'
import ImgZoomIn from '#behaviors/img_zoom_in'
import Loading from '#behaviors/loading'
import Toggler from '#behaviors/toggler'
import { getReverseClaims } from '#entities/lib/entities'
import { I18n, i18n } from '#user/lib/i18n'
import CleanupWorks from './collections/cleanup_works.ts'
import { fillGaps } from './lib/fill_gaps.ts'
import getPartsSuggestions from './lib/get_parts_suggestions.ts'
import moveModelOnOrdinalChange from './lib/move_model_on_ordinal_change.ts'
import { createPlaceholders, removePlaceholder, removePlaceholdersAbove } from './lib/placeholders.ts'
import { spreadParts } from './lib/spread_part.ts'
import SerieCleanupEditions from './serie_cleanup_editions.ts'
import PartsSuggestions from './serie_cleanup_part_suggestion.ts'
import SerieCleanupWorks from './serie_cleanup_works.ts'
import serieCleanupTemplate from './templates/serie_cleanup.hbs'
import '#entities/scss/serie_cleanup.scss'

export default Marionette.View.extend({
  id: 'serieCleanup',
  template: serieCleanupTemplate,

  regions: {
    worksInConflictsRegion: '#worksInConflicts',
    isolatedEditionsRegion: '#isolatedEditions',
    worksWithoutOrdinalRegion: '#worksWithoutOrdinal',
    worksWithOrdinalRegion: '#worksWithOrdinal',
    partsSuggestionsRegion: '#partsSuggestions',
  },

  ui: {
    authorsToggler: '.toggler-label[for="toggleAuthors"]',
    editionsToggler: '.toggler-label[for="toggleEditions"]',
    descriptionsToggler: '.toggler-label[for="toggleDescriptions"]',
    largeToggler: '.toggler-label[for="largeToggler"]',
    createPlaceholdersButton: '#createPlaceholders',
    isolatedEditionsWrapper: '#isolatedEditionsWrapper',
  },

  behaviors: {
    Toggler,
    ImgZoomIn,
    Loading,
  },

  initialize () {
    this.worksWithOrdinal = new CleanupWorks()
    this.worksWithoutOrdinal = new CleanupWorks()
    this.worksInConflicts = new CleanupWorks()
    this.maxOrdinal = 0
    this.placeholderCounter = 0
    this.titleKey = `{${i18n('title')}}`
    this.numberKey = `{${i18n('number')}}`
    this.titlePattern = `${this.titleKey} - ${I18n('volume')} ${this.numberKey}`
    this.allAuthorsUris = this.model.getAllAuthorsUris()
    // this.model.parts.forEach(spreadParts.bind(this))
    // fillGaps.call(this)
    this.initEventListeners()

    this._states = app.request('querystring:get:all')
    this.setStateClass('authors')
    this.setStateClass('editions')
    this.setStateClass('descriptions')
    this.setStateClass('large')
  },

  serializeData () {
    const partsLength = this.worksWithOrdinal.length

    return {
      serie: this.model.toJSON(),
      partsNumberPickerRange: range(this.maxOrdinal, partsLength + 101),
      authorsToggler: {
        id: 'authorsToggler',
        checked: this._states.authors,
        label: 'show authors',
      },
      editionsToggler: {
        id: 'editionsToggler',
        checked: this._states.editions,
        label: 'show editions',
      },
      descriptionsToggler: {
        id: 'descriptionsToggler',
        checked: this._states.descriptions,
        label: 'show descriptions',
      },
      largeToggler: {
        id: 'largeToggler',
        checked: this._states.large,
        label: 'large mode',
      },
      titlePattern: this.titlePattern,
      placeholderCounter: this.placeholderCounter,
    }
  },

  onRender () {
    this.showWorkList({
      name: 'worksInConflicts',
      label: 'parts with ordinal conflicts',
      showPossibleOrdinals: true,
    })

    this.showWorkList({
      name: 'worksWithoutOrdinal',
      label: 'parts without ordinal',
      showPossibleOrdinals: true,
      // Always show so that added suggested parts can join this list
      alwaysShow: true,
    })

    this.showWorkList({
      name: 'worksWithOrdinal',
      label: 'parts with ordinal',
      alwaysShow: true,
    })

    this.showIsolatedEditions()

    this.updatePlaceholderCreationButton()

    this.showPartsSuggestions()
  },

  showWorkList (options) {
    const { name, label, alwaysShow, showPossibleOrdinals } = options
    if (!alwaysShow && (this[name].length === 0)) return
    this.showChildView(`${name}Region`, new SerieCleanupWorks({
      name,
      label,
      collection: this[name],
      showPossibleOrdinals,
      worksWithOrdinal: this.worksWithOrdinal,
      worksWithoutOrdinal: this.worksWithoutOrdinal,
      allAuthorsUris: this.allAuthorsUris,
    }))
  },

  initEventListeners () {
    this.listenTo(this.worksWithoutOrdinal, 'change:claims.wdt:P1545', moveModelOnOrdinalChange.bind(this))
    this.listenTo(this.worksWithOrdinal, 'update', this.updatePlaceholderCreationButton.bind(this))
  },

  events: {
    'change #partsNumber': 'updatePartsNumber',
    'change #authorsToggler': 'toggleAuthors',
    'change #editionsToggler': 'toggleEditions',
    'change #descriptionsToggler': 'toggleDescriptions',
    'change #largeToggler': 'toggleLarge',
    'keyup #titlePattern': 'lazyUpdateTitlePattern',
    'click #createPlaceholders': 'createPlaceholders',
  },

  updatePartsNumber (e) {
    const { value } = e.currentTarget
    this.partsNumber = parseInt(value)
    if (this.partsNumber === this.maxOrdinal) return
    if (this.partsNumber > this.maxOrdinal) {
      // fillGaps.call(this)
    } else {
      this.removePlaceholdersAbove(this.partsNumber)
    }
    this.maxOrdinal = this.partsNumber
    app.vent.trigger('serie:cleanup:parts:change')
    return this.updatePlaceholderCreationButton()
  },

  createPlaceholders,
  removePlaceholder,
  removePlaceholdersAbove,

  toggleAuthors (e) {
    return this.toggle('authors', e)
  },

  toggleEditions (e) {
    this.toggle('editions', e)
    this.ui.editionsToggler.removeClass('glowing')
  },

  toggleDescriptions (e) {
    return this.toggle('descriptions', e)
  },

  toggleLarge (e) {
    return this.toggle('large', e)
  },

  toggle (name, e) {
    const { checked } = e.currentTarget
    this._states[name] = checked
    this.setStateClass(name)
    app.execute('querystring:set', name, checked)
    this[`${name}TogglerChanged`] = true
  },

  setStateClass (name) {
    const checked = this._states[name]
    const className = 'show' + capitalize(name)
    if (checked) {
      this.$el.addClass(className)
    } else {
      this.$el.removeClass(className)
    }
  },

  lazyUpdateTitlePattern: lazyMethod('updateTitlePattern', 1000),
  updateTitlePattern (e) {
    this.titlePattern = e.currentTarget.value
    const placeholders = this.worksWithOrdinal.filter(isPlaceholder)
    this.worksWithOrdinal.remove(placeholders)
    // return fillGaps.call(this)
  },

  updatePlaceholderCreationButton () {
    const placeholders = this.worksWithOrdinal.filter(isPlaceholder)
    this.placeholderCounter = placeholders.length
    if (this.placeholderCounter > 0) {
      this.ui.createPlaceholdersButton.find('.counter').text(`(${this.placeholderCounter})`)
      this.ui.createPlaceholdersButton.removeClass('hidden')
    } else {
      this.ui.createPlaceholdersButton.addClass('hidden')
    }
  },

  async showPartsSuggestions () {
    const serie = this.model
    const addToSerie = spreadParts.bind(this)
    const collection = await getPartsSuggestions(serie)
    if (!this.isIntact()) return
    this.showChildView('partsSuggestionsRegion', new PartsSuggestions({
      collection,
      addToSerie,
      serie,
      worksWithOrdinal: this.worksWithOrdinal,
      worksWithoutOrdinal: this.worksWithoutOrdinal,
    }))
  },

  async showIsolatedEditions () {
    const editions = await getIsolatedEditions(this.model.get('uri'))
    if (!this.isIntact()) return
    if (editions.length === 0) return
    this.ui.isolatedEditionsWrapper.removeClass('hidden')
    const collection = new Backbone.Collection(editions)
    this.showChildView('isolatedEditionsRegion', new SerieCleanupEditions({
      collection,
      worksWithOrdinal: this.worksWithOrdinal,
      worksWithoutOrdinal: this.worksWithoutOrdinal,
    }))
    this.listenTo(collection, 'remove', this.hideIsolatedEditionsWhenEmpty.bind(this))
  },

  hideIsolatedEditionsWhenEmpty (removedEdition, collection) {
    if (collection.length === 0) this.ui.isolatedEditionsWrapper.addClass('hidden')
  },
})

const getIsolatedEditions = serieUri => getReverseClaims('wdt:P629', serieUri, true)
.then(uris => app.request('get:entities:models', { uris }))

const isPlaceholder = model => model.get('isPlaceholder') === true
