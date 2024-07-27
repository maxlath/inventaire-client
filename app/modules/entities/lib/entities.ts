import { flatten, chunk, compact, indexBy, pluck } from 'underscore'
import { API } from '#app/api/api'
import app from '#app/app'
import assert_ from '#app/lib/assert_types'
import { isInvEntityId, isWikidataItemId, isEntityUri, isNonEmptyArray, isImageHash } from '#app/lib/boolean_tests'
import { looksLikeAnIsbn, normalizeIsbn } from '#app/lib/isbn'
import preq from '#app/lib/preq'
import { forceArray, objectEntries } from '#app/lib/utils'
import type { Entity, InvEntity, RedirectionsByUris, RemovedPlaceholder, WdEntity } from '#app/types/entity'
import { getOwnersCountPerEdition } from '#entities/components/lib/edition_action_helpers'
import type { GetEntitiesParams } from '#server/controllers/entities/by_uris_get'
import type { RelativeUrl, Url } from '#server/types/common'
import type { Claims, EntityUri, EntityUriPrefix, EntityId, PropertyUri, InvClaimValue, WdEntityId, WdEntityUri, InvEntityId, NormalizedIsbn, InvEntityUri } from '#server/types/entity'
import getBestLangValue from './get_best_lang_value.ts'
import getOriginalLang from './get_original_lang.ts'
import type { WikimediaLanguageCode } from 'wikibase-sdk'

export interface SerializedEntityCommons {
  label: string
  labelLang: WikimediaLanguageCode
  description: string
  publicationYear?: string
  serieOrdinal?: string
  title?: string
  subtitle?: string
  pathname?: RelativeUrl
  editPathname?: RelativeUrl
  historyPathname?: RelativeUrl
  prefix: EntityUriPrefix
  // Can be set by #app/lib/types/work_alt.ts#setEntityImages
  images?: Url[]
}

export type SerializedInvEntity = InvEntity & SerializedEntityCommons & {
  id: InvEntityId | NormalizedIsbn
  isWikidataEntity: false
}
export type SerializedRemovedPlaceholder = RemovedPlaceholder & SerializedEntityCommons & {
  id: InvEntityId
  invUri: InvEntityUri
  isWikidataEntity: false
}
export type SerializedWdEntity = WdEntity & SerializedEntityCommons & {
  wdId: WdEntityId
  wdUri: WdEntityUri
  isWikidataEntity: true
}

export type SerializedEntity = SerializedInvEntity | SerializedRemovedPlaceholder | SerializedWdEntity

export type SerializedEntitiesByUris = Record<EntityUri, SerializedEntity>

const params = [ 'uris', 'attributes', 'lang', 'relatives', 'refresh' ] as const
type GetEntitiesAttributesByUrisParams = Pick<GetEntitiesParams, typeof params[number]>

export async function getReverseClaims (property: PropertyUri, value: InvClaimValue, refresh?: boolean, sort?: boolean) {
  const { uris } = await preq.get(API.entities.reverseClaims(property, value, refresh, sort))
  return uris as EntityUri[]
}

export function normalizeUri (uri: string) {
  let [ prefix, id ] = uri.split(':')
  if ((id == null)) {
    if (isWikidataItemId(prefix)) {
      [ prefix, id ] = [ 'wd', prefix ]
    } else if (isInvEntityId(prefix)) {
      [ prefix, id ] = [ 'inv', prefix ]
    } else if (looksLikeAnIsbn(prefix)) {
      [ prefix, id ] = [ 'isbn', normalizeIsbn(prefix) ]
    }
  } else {
    if (prefix === 'isbn') id = normalizeIsbn(id)
  }

  if (prefix != null && id != null) {
    return `${prefix}:${id}` as EntityUri
  } else {
    return uri as EntityUri
  }
}

export async function getEntities (uris: EntityUri[], params: Omit<GetEntitiesAttributesByUrisParams, 'uris'> = {}) {
  if (uris.length === 0) return []
  const { entities } = await getManyEntities({ uris, ...params })
  return Object.values(entities).map(serializeEntity)
}

export async function getEntitiesByUris (params: GetEntitiesParams) {
  const { uris, attributes, lang } = params
  if (uris.length === 0) return []
  const { entities, redirects } = await getManyEntities({ uris, attributes, lang })
  const serializedEntities = Object.values(entities).map(serializeEntity)
  const serializedEntitiesByUris = indexBy(serializedEntities, 'uri')
  addRedirectionsAliases(serializedEntitiesByUris, redirects)
  return serializedEntitiesByUris
}

export async function getEntityByUri ({ uri, refresh = false }: { uri: EntityUri, refresh?: boolean }) {
  assert_.string(uri)
  const entities = await getEntities([ uri ], { refresh })
  return entities[0]
}

export function serializeEntity (entity: Entity & Partial<SerializedEntity>) {
  const { value: label, lang: labelLang } = getBestLangValue(app.user.lang, entity.originalLang, entity.labels)
  entity.label = label
  entity.labelLang = labelLang
  if ('descriptions' in entity) {
    entity.description = getBestLangValue(app.user.lang, entity.originalLang, entity.descriptions).value
  }
  if (entity.claims) {
    entity.publicationYear = getPublicationYear(entity)
    entity.originalLang = getOriginalLang(entity.claims)
    entity.serieOrdinal = getSerieOrdinal(entity.claims)
    const title = entity.claims['wdt:P1476']?.[0]
    if (title) {
      entity.title = title
      entity.subtitle = entity.claims['wdt:P1680']?.[0]
    } else {
      entity.title = entity.label
    }
  }
  const basePathname = entity.pathname = getPathname(entity.uri)
  entity.editPathname = `${basePathname}/edit`
  entity.historyPathname = `${basePathname}/history`
  let wdUri, invUri
  let isWikidataEntity = false
  if ('wdId' in entity) {
    isWikidataEntity = true
    wdUri = `wd:${entity.wdId}`
  }
  if ('invId' in entity) {
    invUri = `inv:${entity.invId}`
  }
  const [ prefix, id ] = entity.uri.split(':')
  entity.prefix = prefix as EntityUriPrefix
  return {
    id: id as EntityId,
    wdUri,
    invUri,
    isWikidataEntity,
    ...entity,
  } as SerializedEntity
}

const getPathname = (uri: EntityUri) => `/entity/${uri}` as RelativeUrl

export async function attachEntities (entity: Entity | SerializedEntity, attribute: string, uris: EntityUri[]) {
  entity[attribute] = await getEntities(uris)
  return entity
}

// Limiting the amount of uris requested to not get over the HTTP GET querystring length threshold.
// Not using the POST equivalent endpoint, has duplicated request would then be answered with a 429 error
// Also, do not export function to consumers clean, one may import getEntities or getEntitiesByUris
async function getManyEntities ({ uris, attributes, lang, relatives, refresh }: GetEntitiesAttributesByUrisParams) {
  const urisChunks = chunk(uris, 30)
  const responses = await Promise.all(urisChunks.map(async urisChunks => {
    return preq.get(API.entities.getAttributesByUris({ uris: urisChunks, attributes, lang, relatives, refresh }))
  }))
  const entities: SerializedEntitiesByUris = mergeResponsesObjects(responses, 'entities')
  const redirects: RedirectionsByUris = mergeResponsesObjects(responses, 'redirects')
  return { entities, redirects }
}

function mergeResponsesObjects (responses, attribute) {
  const objs = compact(pluck(responses, attribute))
  if (objs.length > 0) {
    // @ts-expect-error
    return Object.assign(...objs)
  } else {
    return {}
  }
}

export async function getEntitiesAttributesByUris ({ uris, attributes, lang, relatives }: GetEntitiesAttributesByUrisParams) {
  uris = forceArray(uris)
  let entities: SerializedEntitiesByUris = {}
  if (!isNonEmptyArray(uris)) {
    return { entities }
  }
  let redirects: RedirectionsByUris = {}
  attributes = forceArray(attributes)
  ;({ entities, redirects } = await getManyEntities({ uris, attributes, lang, relatives }))
  addRedirectionsAliases(entities, redirects)
  return { entities }
}

function addRedirectionsAliases (entities: SerializedEntitiesByUris, redirects: RedirectionsByUris) {
  if (redirects) {
    for (const [ fromUri, toUri ] of objectEntries(redirects)) {
      entities[fromUri] = entities[toUri]
    }
  }
}

export async function getEntitiesBasicInfoByUris (uris: EntityUri[]) {
  return getEntitiesByUris({
    uris,
    attributes: [ 'info', 'labels', 'descriptions', 'image' ],
    lang: app.user.lang,
  })
}

export async function getEntityLabel (uri: EntityUri) {
  const entities = await getEntitiesByUris({
    uris: [ uri ],
    attributes: [ 'labels' ],
    lang: app.user.lang,
  })
  const entity = Object.values(entities)[0]
  const { value, lang } = getBestLangValue(app.user.lang, null, entity.labels)
  return { label: value, lang }
}

export async function getAndAssignPopularity ({ entities }) {
  const uris = []
  let wdUrisCount = 0
  entities.forEach(entity => {
    const { uri } = entity
    if (entity.popularity === undefined) {
      uris.push(uri)
      if (uri.startsWith('wd:')) wdUrisCount++
    }
  })
  if (!isNonEmptyArray(uris)) return entities
  // Limiting refresh to not overcrowd Wikidata
  const refresh = wdUrisCount < 30
  const urisChunks = chunk(uris, 30)
  const responses = await Promise.all(urisChunks.map(async urisChunk => {
    return preq.get(API.entities.popularity(urisChunk, refresh))
  }))
  const scores = mergeResponsesObjects(responses, 'scores')

  entities.forEach(entity => {
    const popularity = scores[entity.uri]
    if (popularity >= 0) entity.popularity = popularity
  })
}

export async function getEntityBasicInfoByUri (uri: EntityUri) {
  const entities = await getEntitiesBasicInfoByUris([ uri ])
  return entities[uri]
}

export async function getEntitiesAttributesFromClaims (claims: Claims, attributes: GetEntitiesParams['attributes']) {
  if (!attributes) attributes = [ 'labels' ]
  const claimsValues = flatten(Object.values(claims))
  const uris = claimsValues.filter(isEntityUri)
  const { entities } = await getEntitiesAttributesByUris({
    uris,
    attributes,
    lang: app.user.lang,
  })
  return entities
}

export function getWikidataUrl (uri: EntityUri) {
  const [ prefix, id ] = uri.split(':')
  if (prefix === 'wd') {
    return `https://www.wikidata.org/entity/${id}`
  }
}

export function getWikidataHistoryUrl (uri: EntityUri) {
  const [ prefix, id ] = uri.split(':')
  if (prefix === 'wd') {
    return `https://www.wikidata.org/w/index.php?title=${id}&action=history`
  }
}

export const getEntityLocalHref = (uri: EntityUri) => `/entity/${uri}`

const getSerieOrdinal = claims => claims['wdt:P1545']?.[0]

export function bySerieOrdinal (a, b) {
  return parseFloat(a.serieOrdinal || 10000) - parseFloat(b.serieOrdinal || 10000)
}

export function byPublicationDate (a, b) {
  // Ascendant order
  return parseInt(a.publicationYear || 10000) - parseInt(b.publicationYear || 10000)
}

export function byNewestPublicationDate (a, b) {
  // Descending order
  return parseInt(b.publicationYear || 0) - parseInt(a.publicationYear || 0)
}

export function byPopularity (a, b) {
  // Descending order
  return parseInt(b.popularity || 0) - parseInt(a.popularity || 0)
}

export function byItemsOwnersCount (a, b) {
  // Descending order
  return (getOwnersCountPerEdition(b.items) || 0) - (getOwnersCountPerEdition(a.items) || 0)
}

export function getPublicationYear (entity: Entity) {
  const date = entity.claims['wdt:P577']?.[0]
  return getYearFromSimpleDay(date)
}

export function getYearFromSimpleDay (date) {
  if (!date) return
  if (date[0] === '-') {
    const year = date.split('-')[1]
    return `-${year}`
  } else {
    return date.split('-')[0]
  }
}

export async function getEntitiesImages (uris: EntityUri[]) {
  if (uris.length === 0) return {}
  const { images } = await preq.get(API.entities.images(uris))
  return images
}

export async function getEntityImage (uri: EntityUri) {
  const images = getEntitiesImages([ uri ])
  return images[uri]
}
export async function getEntitiesImagesUrls (uris: EntityUri[]) {
  const images = await getEntitiesImages(uris)
  return extractImagesUrls(images)
}

export async function getEntityImageUrl (uri: EntityUri) {
  const imagesUrls = await getEntitiesImagesUrls([ uri ])
  return imagesUrls[0]
}

export function extractImagesUrls (images) {
  const imageUrls = Object.values(images).map(entityImages => {
    const firstImage = getBestLangValue(app.user.lang, null, entityImages).value
    if (firstImage) return getEntityImagePath(firstImage)
  })
  return compact(imageUrls)
}

export function getEntityImagePath (imageValue) {
  if (isImageHash(imageValue)) return `/img/entities/${imageValue}`
  else return imageValue
}
