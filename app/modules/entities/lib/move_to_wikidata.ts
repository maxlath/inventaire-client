import { API } from '#app/api/api'
import app from '#app/app'
import { isWikidataItemUri } from '#app/lib/boolean_tests'
import preq from '#app/lib/preq'
import { objectEntries } from '#app/lib/utils'
import { unprefixify } from '#app/lib/wikimedia/wikidata'
import { propertiesEditorsConfigs } from '#entities/lib/properties'
import type { EntityUri } from '#server/types/entity'
import { i18n, I18n } from '#user/lib/i18n'
import { isNonEmptyClaimValue } from '../components/editor/lib/editors_helpers'
import type { SerializedEntity } from './entities'

export async function moveToWikidata (invEntityUri: EntityUri) {
  await preq.put(API.entities.moveToWikidata, { uri: invEntityUri })
  // Get the refreshed, redirected entity
  // thus also updating entitiesModelsIndexedByUri
  return app.request('get:entity:model', invEntityUri, true)
}

export function checkWikidataMoveabilityStatus (entity: SerializedEntity) {
  const { uri, type, claims } = entity

  // An entity being created on Inventaire won't have a URI at this point
  if ((uri == null) || isWikidataItemUri(uri)) return { ok: false }

  if (type === 'collection' && !isNonEmptyClaimValue(claims['wdt:P407']?.[0])) {
    return {
      ok: false,
      reason: I18n('This collection can not be moved to Wikidata as it lacks a language claim'),
    }
  }

  for (const [ property, values ] of objectEntries(claims)) {
    if (propertiesEditorsConfigs[property]?.datatype === 'entity') {
      for (const value of values) {
        if (isNonEmptyClaimValue(value) && !isWikidataItemUri(value)) {
          const message = I18n("some values aren't Wikidata entities:")
          return {
            ok: false,
            reason: `${message}: ${i18n(unprefixify(property))} (${property})`,
          }
        }
      }
    }
  }

  return {
    ok: true,
    reason: I18n('this entity is ready to be imported to Wikidata'),
  }
}
