import { API } from '#app/api/api'
import app from '#app/app'
import assert_ from '#app/lib/assert_types'
import { isPropertyUri, isEntityUri } from '#app/lib/boolean_tests'
import { serverReportError, newError } from '#app/lib/error'
import log_ from '#app/lib/loggers'
import preq from '#app/lib/preq'
import type { SerializedEntity, SerializedWdEntity } from '#entities/lib/entities'
import { entityTypeNameBySingularType } from '#entities/lib/types/entities_types'
import type { WdEntityUri } from '#server/types/entity'
import { i18n } from '#user/lib/i18n'
import { getEntityByUri, normalizeUri } from './lib/entities.ts'
import * as entitiesModelsIndex from './lib/entities_models_index.ts'
import { entityDataShouldBeRefreshed, startRefreshTimeSpan } from './lib/entity_refresh.ts'
import { getEntityLayoutComponentByType } from './lib/get_entity_layout_component_by_type.ts'

export default {
  initialize () {
    const Router = Marionette.AppRouter.extend({
      appRoutes: {
        'entity/new(/)': 'showEntityCreateFromRoute',
        'entity/changes(/)': 'showChanges',
        'entity/contributions(/)': 'showContributionsCounts',
        'entity/deduplicate(/authors)(/)': 'showDeduplicateAuthors',
        'entity/merge(/)': 'showEntityMerge',
        'entity/:uri/add(/)': 'showAddEntity',
        'entity/:uri/edit(/)': 'showEditEntityFromUri',
        'entity/:uri/cleanup(/)': 'showEntityCleanup',
        'entity/:uri/homonyms(/)': 'showHomonyms',
        'entity/:uri/deduplicate(/)': 'showEntityDeduplicate',
        'entity/:uri/history(/)': 'showEntityHistory',
        'entity/:uri(/)': 'showEntity',
      },
    })

    new Router({ controller })

    setHandlers()
  },
}

const controller = {
  async showEntity (uri, params?) {
    const refresh = params?.refresh || app.request('querystring:get', 'refresh') || entityDataShouldBeRefreshed(uri)
    if (refresh) startRefreshTimeSpan(uri)
    if (isClaim(uri)) return showClaimEntities(uri, refresh)

    uri = normalizeUri(uri)
    const pathname = `/entity/${uri}`
    if (!isEntityUri(uri)) return app.execute('show:error:missing', { pathname })

    app.execute('show:loader')

    try {
      const entity = await getEntityByUri({ uri, refresh })
      rejectRemovedPlaceholder(entity)
      const { Component, props } = await getEntityLayoutComponentByType(entity)
      app.layout.showChildComponent('main', Component, { props })
    } catch (err) {
      handleMissingEntity(uri, err)
    }
  },

  async showAddEntity (uri) {
    uri = normalizeUri(uri)
    try {
      const entity = await getEntityModel(uri)
      app.execute('show:item:creation:form', { entity })
    } catch (err) {
      handleMissingEntity(uri, err)
    }
  },

  async showEditEntityFromUri (uri) {
    app.execute('show:loader')
    uri = normalizeUri(uri)

    try {
      // Make sure we have the freshest data before trying to edit (refresh=true)
      // but prevent triggering an auto update (autocreate=false)
      // Maybe the server should allow to set autocreate=true&autoedit=false
      // to fetch authorities data only in cases where no entity was found
      const entity = await getEntityByUri({ uri, refresh: true, autocreate: false })
      await showEntityEdit(entity)
    } catch (err) {
      handleMissingEntity(uri, err)
    }
  },

  async showEntityCreateFromRoute () {
    try {
      if (app.request('require:loggedIn', 'entity/new')) {
        const params = app.request('querystring:get:all')
        await showEntityCreate(params)
      }
    } catch (err) {
      app.execute('show:error', err)
    }
  },

  async showChanges () {
    if (!app.request('require:loggedIn', 'entity/changes')) return
    if (!app.request('require:admin:access')) return
    const { default: Contributions } = await import('#entities/components/patches/contributions.svelte')
    app.layout.showChildComponent('main', Contributions)
    app.navigate('entity/changes', { metadata: { title: i18n('recent changes') } })
  },

  async showContributionsCounts () {
    const { default: ContributionsCounts } = await import('./components/contributions_counts.svelte')
    showViewByAccessLevel({
      path: 'entity/contributions',
      title: 'contributions',
      Component: ContributionsCounts,
      accessLevel: 'admin',
    })
  },

  async showDeduplicateAuthors () {
    const { default: DeduplicateAuthorsNames } = await import('./components/deduplicate_authors_names.svelte')
    showViewByAccessLevel({
      path: 'entity/deduplicate/authors',
      title: `${i18n('deduplicate')} - ${i18n('authors')}`,
      Component: DeduplicateAuthorsNames,
      navigate: true,
      accessLevel: 'dataadmin',
    })
  },

  async showEntityDeduplicate (uri) {
    const [
      entity,
      { default: DeduplicateWorks },
    ] = await Promise.all([
      getEntityByUri({ uri }),
      import('./components/deduplicate_works.svelte'),
    ])

    const { type } = entity
    if (type !== 'human') {
      const err = new Error(`case not handled yet: ${type}`)
      app.execute('show:error', err)
      return
    }

    showViewByAccessLevel({
      path: `entity/${uri}/deduplicate`,
      title: `${entity.label} - ${i18n('deduplicate')} - ${i18n('works')}`,
      Component: DeduplicateWorks,
      componentProps: { author: entity },
      accessLevel: 'dataadmin',
    })
  },

  showEntityCleanup (uri) {
    if (app.request('require:loggedIn', `entity/${uri}/cleanup`)) {
      app.execute('show:loader')
      uri = normalizeUri(uri)

      return getEntityModel(uri, true)
      .then(showEntityCleanupFromModel)
      .catch(handleMissingEntity.bind(null, uri))
    }
  },

  async showHomonyms (uri) {
    if (!app.request('require:loggedIn', `entity/${uri}/homonyms`)) return
    if (!app.request('require:dataadmin:access')) return

    app.execute('show:loader')
    const [
      { default: HomonymDeduplicates },
      entity,
    ] = await Promise.all([
      import('./components/layouts/deduplicate_homonyms.svelte'),
      getEntityByUri({ uri }),
    ])
    app.layout.showChildComponent('main', HomonymDeduplicates, {
      props: {
        entity,
        standalone: true,
      },
    })
  },

  async showEntityHistory (uri) {
    app.execute('show:loader')
    uri = normalizeUri(uri)
    const { default: EntityHistory } = await import('./components/patches/entity_history.svelte')
    app.layout.showChildComponent('main', EntityHistory, {
      props: { uri },
    })
  },

  async showEntityMerge () {
    const { from, to, type } = app.request('querystring:get:all')
    app.execute('show:loader')
    const { default: EntityMerge } = await import('./components/entity_merge.svelte')
    app.layout.showChildComponent('main', EntityMerge, {
      props: { from, to, type },
    })
  },
}

async function showEntityCreate (params) {
  const path = 'entity/new'
  if (!app.request('require:loggedIn', path)) return
  app.navigate(path)

  // Drop possible type pluralization
  params.type = params.type?.replace(/s$/, '')

  // Known case: when clicking 'create' while live search section is 'subject'
  if (entityTypeNameBySingularType[params.type] == null) {
    params.type = null
  }
  if (params.type) app.execute('querystring:set', 'type', params.type)
  if (params.claims) app.execute('querystring:set', 'claims', params.claims)

  const { default: EntityCreate } = await import('./components/editor/entity_create.svelte')
  app.layout.showChildComponent('main', EntityCreate, {
    props: params,
  })
}

function setHandlers () {
  app.commands.setHandlers({
    'show:entity': controller.showEntity.bind(controller),
    'show:claim:entities' (property, value) {
      const claim = `${property}-${value}`
      controller.showEntity(claim)
      app.navigate(`entity/${claim}`)
    },

    'show:entity:from:model' (model, params) {
      const uri = model.get('uri')
      if (uri != null) {
        app.execute('show:entity', uri, params)
      } else {
        throw new Error("couldn't show:entity:from:model")
      }
    },

    'show:entity:refresh' (model) {
      app.execute('show:entity:from:model', model, { refresh: true })
    },

    'show:deduplicate:sub:entities' (model) {
      const uri = model.get('uri')
      controller.showEntityDeduplicate(uri)
    },

    'show:entity:add': controller.showAddEntity.bind(controller),
    'show:entity:add:from:model' (model) { return controller.showAddEntity(model.get('uri')) },
    'show:entity:edit': controller.showEditEntityFromUri,
    'show:entity:edit:from:model' (model) {
      // Uses controller.showEditEntityFromUri the fetch fresh entity data
      return controller.showEditEntityFromUri(model.get('uri'))
    },
    'show:entity:create': showEntityCreate,
    'show:entity:cleanup': controller.showEntityCleanup,
    'show:entity:history': controller.showEntityHistory,
    'report:entity:type:issue': reportTypeIssue,
    'show:wikidata:edit': async (uri: WdEntityUri) => {
      const entity = await getEntityByUri({ uri })
      showWikidataEditIntro(entity)
    },
  })

  app.reqres.setHandlers({
    'get:entity:model': getEntityModel,
    'get:entities:models': getEntitiesModels,
    'entity:exists:or:create:from:seed': existsOrCreateFromSeed,
  })
}

const getEntitiesModels = async function (params) {
  let { uris, refresh, defaultType, index } = params
  assert_.array(uris)
  assert_.strings(uris)
  // Make sure its a 'true' flag and not an object incidently passed
  refresh = refresh === true

  if (uris.length === 0) return []

  const models = await entitiesModelsIndex.get({ uris, refresh, defaultType })
  if (index) return models
  // Do not return entities with type 'missing'.
  // This type is used to avoid re-fetching an entity already known to be missing
  // but has no interest past entitiesModelsIndex
  else return Object.values(models).filter(isntMissing)
}

// Known case of model being undefined: when the model initialization failed
const isntMissing = model => (model != null) && (model?.type !== 'missing')

async function getEntityModel (uri, refresh?) {
  // @ts-expect-error deprecated
  const [ model ] = await getEntitiesModels({ uris: [ uri ], refresh })
  if (model != null) {
    return model
  } else {
    // See getEntitiesModels "Possible reasons for missing entities"
    log_.info(`getEntityModel entity_not_found: ${uri}`)
    const err = newError('entity_not_found', [ uri, model ])
    err.code = 'entity_not_found'
    throw err
  }
}

async function showEntityEdit (entity: SerializedEntity) {
  if (!entity) return app.execute('show:error:missing')
  const { uri, type, label, editPathname } = entity
  if (!editPathname) {
    throw newError('this entity can not be edited', 400, { uri, type })
  }
  if (!app.request('require:loggedIn', editPathname)) return

  rejectRemovedPlaceholder(entity)

  if (type == null) throw newError('invalid entity type', 400, { entity })
  const { default: EntityEdit } = await import('./components/editor/entity_edit.svelte')
  app.layout.showChildComponent('main', EntityEdit, {
    props: {
      entity,
    },
  })
  app.navigate(editPathname, { metadata: { title: `${label} - ${i18n('edit')}` } })
}

async function showWikidataEditIntro (entity: SerializedWdEntity) {
  const { default: WikidataEditIntro } = await import('./components/wikidata_edit_intro.svelte')
  app.layout.showChildComponent('main', WikidataEditIntro, { props: { entity } })
}

function rejectRemovedPlaceholder (entity: SerializedEntity) {
  if ('_meta_type' in entity && entity._meta_type === 'removed:placeholder') {
    throw newError('removed placeholder', 400, { entity })
  }
}

function handleMissingEntity (uri, err) {
  if (err.message === 'invalid entity type') {
    app.execute('show:error:other', err)
  } else if (err.code === 'entity_not_found') {
    const [ prefix, id ] = uri.split(':')
    const pathname = `/entity/${uri}`
    if (app.user.loggedIn && prefix === 'isbn') showEntityCreateFromIsbn(id)
    else app.execute('show:error:missing', { pathname })
  } else {
    app.execute('show:error:other', err, 'handleMissingEntity')
  }
}

async function showEntityCreateFromIsbn (isbn) {
  const isbnData = await preq.get(API.data.isbn(isbn))

  const { isbn13h, groupLangUri } = isbnData
  const claims = { 'wdt:P212': [ isbn13h ] }
  if (isEntityUri(groupLangUri)) {
    claims['wdt:P407'] = [ groupLangUri ]
  }

  const { default: EntityCreateEditionAndWorkFromIsbn } = await import('./components/editor/entity_create_edition_and_work_from_isbn.svelte')
  app.layout.showChildComponent('main', EntityCreateEditionAndWorkFromIsbn, {
    props: {
      isbn13h,
      edition: { claims },
    },
  })
}

// Create from the seed data we have, if the entity isn't known yet
async function existsOrCreateFromSeed (entry) {
  const { entries } = await preq.post(API.entities.resolve, {
    entries: [ entry ],
    update: true,
    create: true,
    enrich: true,
  })
  // Add the possibly newly created edition entity to the local index
  // and get it's model
  const { uri } = entries[0].edition
  return getEntityModel(uri, true)
}

function showViewByAccessLevel (params) {
  let { path, title, View, viewOptions, Component, componentProps, navigate, accessLevel } = params
  if (navigate == null) navigate = true
  if (app.request('require:loggedIn', path)) {
    if (navigate) app.navigate(path, { metadata: { title } })
    if (app.request(`require:${accessLevel}:access`)) {
      if (View) {
        app.layout.showChildView('main', new View(viewOptions))
      } else {
        app.layout.showChildComponent('main', Component, {
          props: componentProps,
        })
      }
    }
  }
}

const isClaim = claim => /^(wdt:|invp:)/.test(claim)

async function showClaimEntities (claim, refresh) {
  const [ property, value ] = claim.split('-')
  const pathname = `/entity/${claim}`

  if (!isPropertyUri(property)) {
    serverReportError('invalid property')
    app.execute('show:error:missing', { pathname })
    return
  }

  if (!isEntityUri(value)) {
    serverReportError('invalid value')
    app.execute('show:error:missing', { pathname })
    return
  }

  const { default: ClaimLayout } = await import('#entities/components/layouts/claim_layout.svelte')
  const entity = await getEntityByUri({ uri: value, refresh })
  app.layout.showChildComponent('main', ClaimLayout, {
    props: {
      property,
      entity,
    },
  })
}

function reportTypeIssue (params) {
  const { expectedType, model, context } = params
  const [ uri, realType ] = model.gets('uri', 'type')
  if (reportedTypeIssueUris.includes(uri)) return
  reportedTypeIssueUris.push(uri)

  const subject = `[Entity type] ${uri}: expected ${expectedType}, got ${realType}`
  app.request('post:feedback', { subject, uris: [ uri ], context })
}

const reportedTypeIssueUris = []

async function showEntityCleanupFromModel (entity) {
  if (entity.type !== 'serie') {
    const err = newError(`cleanup isn't available for entity type ${entity.type}`, 400)
    app.execute('show:error', err)
    return
  }

  const [ { default: SerieCleanup } ] = await Promise.all([
    import('./views/cleanup/serie_cleanup.ts'),
    entity.initSerieParts({ refresh: true, fetchAll: true }),
  ])

  app.layout.showChildView('main', new SerieCleanup({ model: entity }))
  app.navigateFromModel(entity, 'cleanup')
}
