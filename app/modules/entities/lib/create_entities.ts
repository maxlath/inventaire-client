import app from '#app/app'
import { newError } from '#app/lib/error'
import { getIsbnData } from '#app/lib/isbn'
import log_ from '#app/lib/loggers'
import { arrayIncludes, objectEntries } from '#app/lib/utils'
import type { Entity as EntityT } from '#app/types/entity'
import { isNonEmptyClaimValue } from '#entities/components/editor/lib/editors_helpers'
import { addModel as addEntityModel } from '#entities/lib/entities_models_index'
import getOriginalLang from '#entities/lib/get_original_lang'
import type { SimplifiedClaims } from '#server/types/entity'
import Entity from '../models/entity.ts'
import createEntity from './create_entity.ts'
import { graphRelationsProperties } from './graph_relations_properties.ts'

const getTitleFromWork = function ({ workLabels, workClaims, editionLang }) {
  const inEditionLang = workLabels[editionLang]
  if (inEditionLang != null) return inEditionLang

  const inUserLang = workLabels[app.user.lang]
  if (inUserLang != null) return inUserLang

  const originalLang = getOriginalLang(workClaims)
  const inWorkOriginalLang = workLabels[originalLang]
  if (inWorkOriginalLang != null) return inWorkOriginalLang

  const inEnglish = workLabels.en
  if (inEnglish != null) return inEnglish

  return Object.values(workLabels)[0]
}

export const createWorkEditionDraft = async function ({ workEntity, isbn }) {
  const { labels: workLabels, claims: workClaims, uri: workUri, label } = workEntity

  const claims = {
    // instance of (P31) -> edition (Q3331189)
    'wdt:P31': [ 'wd:Q3331189' ],
    // edition or translation of (P629) -> created book
    'wdt:P629': [ workUri ],
  }

  let title, editionLang
  if (isbn) {
    const { isbn13h, title: isbnDataTitle, image, groupLang } = await getIsbnData(isbn)

    editionLang = groupLang

    if (isbnDataTitle) {
      title = isbnDataTitle
      log_.info(title, 'title from isbn data')
    }

    // isbn 13 (isbn 10 - if it exist - will be added by the server)
    claims['wdt:P212'] = [ isbn13h ]

    if (image != null) {
      claims['invp:P2'] = [ image ]
    }
  }
  // if workEntity has been formatted already, use the label as title
  // known case: autocomplete editor suggestion (which do not have `labels` key)
  if (label) title = label
  if (!title) title = getTitleFromWork({ workLabels, workClaims, editionLang })
  if (title == null) throw newError('no title could be found', workEntity)
  claims['wdt:P1476'] = [ title ]
  return { labels: {}, claims }
}

export const createByProperty = async function (options) {
  let { property, name, relationSubjectEntity, createOnWikidata, lang } = options
  if (!lang) lang = app.user.lang

  const wdtP31 = subjectEntityP31ByProperty[property]
  if (wdtP31 == null) {
    throw newError('no entity creation function associated to this property', options)
  }

  const claims = { 'wdt:P31': [ wdtP31 ] }

  let labels
  if (property === 'wdt:P195') {
    labels = {}
    claims['wdt:P1476'] = [ name ]
  } else {
    labels = { [lang]: name }
  }

  if (property === 'wdt:P179') {
    claims['wdt:P50'] = relationSubjectEntity.claims['wdt:P50']
  }

  if (property === 'wdt:P195') {
    claims['wdt:P123'] = relationSubjectEntity.claims['wdt:P123']
    if (claims['wdt:P123'] == null) {
      throw newError('a publisher should be set before creating a collection', options)
    }
  }

  return createAndGetEntityModel({ labels, claims, createOnWikidata })
}

const subjectEntityP31ByProperty = {
  // human
  'wdt:P50': 'wd:Q5',
  // publisher
  'wdt:P123': 'wd:Q2085381',
  // serie
  'wdt:P179': 'wd:Q277759',
  // work
  'wdt:P629': 'wd:Q47461344',
  'wdt:P655': 'wd:Q5',
  'wdt:P2679': 'wd:Q5',
  'wdt:P2680': 'wd:Q5',
  // collection
  'wdt:P195': 'wd:Q20655472',
}

export async function createAndGetEntityModel (params: Partial<EntityT> & { createOnWikidata?: boolean }) {
  const { claims } = params
  cleanupClaims(claims)
  const entityData = await createEntity(params)
  triggerEntityGraphChangesEvents(claims)
  const model = new Entity(entityData)
  // Update the local cache
  addEntityModel(model)
  return model
}

function cleanupClaims (claims: SimplifiedClaims) {
  for (const [ property, propertyClaims ] of objectEntries(claims)) {
    // @ts-expect-error
    claims[property] = propertyClaims.filter(isNonEmptyClaimValue)
  }
}

export async function createAndGetEntity (params) {
  const model = await createAndGetEntityModel(params)
  return model.toJSON()
}

const triggerEntityGraphChangesEvents = claims => {
  for (const prop in claims) {
    const values = claims[prop]
    if (arrayIncludes(graphRelationsProperties, prop)) {
      // Signal to the entity that it was affected by another entity's change
      // so that it refreshes it's graph data next time
      app.execute('invalidate:entities:graph', values)
    }
  }
}
