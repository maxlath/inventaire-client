import { isPrerenderSession } from '#app/lib/metadata/update'
import { forceArray } from '#app/lib/utils'
import type { QueryParams } from '#app/types/entity'
import type { EntityUri, PropertyUri } from '#server/types/entity'
import { getEndpointPathBuilders } from './endpoint.ts'

const { action } = getEndpointPathBuilders('entities')

const customQueryFactory = (actionName: string) => (uri: EntityUri, refresh?: boolean) => action(actionName, { uri, refresh })

export default {
  // GET
  getByUris (uris: EntityUri | EntityUri[], refresh?: boolean, relatives?: PropertyUri | PropertyUri[]) {
    return action('by-uris', {
      uris: forceArray(uris).join('|'),
      refresh,
      relatives: (relatives != null) ? forceArray(relatives).join('|') : undefined,
      autocreate: !isPrerenderSession,
    })
  },

  getAttributesByUris ({ uris, attributes, lang, relatives, refresh }) {
    const query: QueryParams = {
      uris: forceArray(uris).join('|'),
    }
    if (attributes) {
      query.attributes = forceArray(attributes).join('|')
    }
    if (lang) {
      query.lang = lang
    }
    if (relatives != null) query.relatives = forceArray(relatives).join('|')
    if (refresh === true) query.refresh = true
    return action('by-uris', query)
  },

  // Get many by POSTing URIs in the body
  getManyByUris: action('by-uris'),

  reverseClaims (property: PropertyUri, value: string | number, refresh?: boolean, sort?: boolean) {
    return action('reverse-claims', { property, value, refresh, sort })
  },

  authorWorks: customQueryFactory('author-works'),
  serieParts: customQueryFactory('serie-parts'),
  publisherPublications: customQueryFactory('publisher-publications'),

  images (uris: EntityUri[], refresh?: boolean) {
    return action('images', {
      uris: forceArray(uris).join('|'),
      refresh,
    })
  },

  usersContributionsCount: period => {
    if (period) return action('contributions-count', { period })
    else return action('contributions-count')
  },

  changes: action('changes'),
  history: id => action('history', { id }),

  popularity (uris, refresh) {
    uris = forceArray(uris).join('|')
    return action('popularity', { uris, refresh })
  },

  // POST
  create: action('create'),
  resolve: action('resolve'),

  // PUT
  claims: {
    update: action('update-claim'),
  },

  labels: {
    update: action('update-label'),
    remove: action('remove-label'),
  },

  merge: action('merge'),

  revertEdit: action('revert-edit'),

  delete: action('delete'),
  duplicates: action('duplicates'),
  contributions ({ userId, limit, offset, filter }) {
    return action('contributions', { user: userId, limit, offset, filter })
  },
  moveToWikidata: action('move-to-wikidata'),
}
