import app from '#app/app'
import { buildPath } from '#app/lib/location'
import type { WdEntityId } from '#server/types/entity'

const wdHost = 'https://www.wikidata.org'

export function searchWikidataEntities (params) {
  const { search, limit, offset } = params

  if (search?.length <= 0) throw new Error("search can't be empty")

  const { lang } = app.user

  return buildPath(`${wdHost}/w/api.php`, {
    action: 'wbsearchentities',
    search,
    language: lang,
    uselang: lang,
    limit,
    continue: offset,
    format: 'json',
    origin: '*',
  })
}

// Unprefixify both entities ('item' in Wikidata lexic) and properties
export const unprefixify = value => value?.replace(/^wdt?:/, '')

export const getUriNumericId = uri => parseInt(uri.split(':')[1].substring(1))

export function getWdWikiUrl (wdId: WdEntityId) {
  return `${wdHost}/wiki/${wdId}`
}

export function getWdHistoryUrl (wdId: WdEntityId) {
  return `${wdHost}/w/index.php?title=${wdId}&action=history`
}
