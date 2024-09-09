import { pick, values, compact, uniq, without, pluck } from 'underscore'
import { API } from '#app/api/api'
import preq from '#app/lib/preq'
import { authorProperties, type AuthorProperty } from '#entities/lib/properties'
import type { EntityUri, PropertyUri, SerializedEntity } from '#server/types/entity'
import { getEntities } from '../entities'

export function getSerieOrWorkExtendedAuthorsUris (entity: SerializedEntity, ignoredProperty?: AuthorProperty) {
  const props = (ignoredProperty ? without(authorProperties, ignoredProperty) : authorProperties) as PropertyUri[]
  const authorUris = values(pick(entity.claims, props)).flat()
  return uniq(compact(authorUris)) as EntityUri[]
}

export async function getSerieParts (serie: SerializedEntity, { refresh = false, fetchAll = false }) {
  const { parts } = await preq.get(API.entities.serieParts(serie.uri, refresh))
  console.log('🚀 ~ file: serie_alt.ts ~ line', 15, 'getSerieParts ~ ', { parts })
  const allsPartsUris = pluck(parts, 'uri')
  const partsWithoutSuperparts = parts.filter(hasNoKnownSuperpart(allsPartsUris))
  const entities = await getEntities(allsPartsUris)
  // .then(initPartsCollections.bind(this, refresh, fetchAll))
  // .then(importDataFromParts.bind(this))

  return entities
}

const hasNoKnownSuperpart = allsPartsUris => part => {
  if (part.superpart == null) return true
  return !allsPartsUris.includes(part.superpart)
}
