import assert_ from '#app/lib/assert_types'
import { forceArray } from '#app/lib/utils'
import type { QueryParams } from '#app/types/entity'
import type { GroupId } from '#server/types/group'
import type { ShelfId } from '#server/types/shelf'
import type { UserId } from '#server/types/user'
import { getEndpointPathBuilders } from './endpoint.ts'

const { base, action } = getEndpointPathBuilders('items')

const queryEndpoint = (actionName, idsLabel) => params => {
  const { ids, limit, offset, filter, includeUsers } = params
  const data: QueryParams = {}
  if (idsLabel != null) data[idsLabel] = forceArray(ids).join('|')
  if (limit != null) data.limit = limit
  if (offset != null) data.offset = offset
  if (filter != null) data.filter = filter
  if (includeUsers != null) data['include-users'] = includeUsers
  return action(actionName, data)
}

export default {
  base,
  update: action('bulk-update'),

  byIds: queryEndpoint('by-ids', 'ids'),
  byUsers: queryEndpoint('by-users', 'users'),
  byEntities: queryEndpoint('by-entities', 'uris'),

  byUserAndEntities (user, uris) {
    uris = forceArray(uris).join('|')
    return action('by-user-and-entities', { user, uris })
  },

  lastPublic (limit = 15, offset = 0, assertImage) {
    return action('last-public', { limit, offset, 'assert-image': assertImage })
  },

  recentPublic (limit = 15, lang, assertImage) {
    return action('recent-public', { limit, lang, 'assert-image': assertImage })
  },

  byBbox (bbox, limit, lang) {
    return action('by-bbox', { bbox, limit, lang })
  },

  nearby (limit, offset, range = 50) { return action('nearby', { limit, offset, range }) },

  inventoryView (params) { return action('inventory-view', params) },

  deleteByIds: action('delete-by-ids'),

  search ({ user, group, shelf, search, limit, offset }: { user?: UserId, group?: GroupId, shelf?: ShelfId, search: string, limit?: number, offset?: number }) {
    search = encodeURIComponent(search)
    assert_.string(user || group || shelf)
    return action('search', { user, group, shelf, search, limit, offset })
  },

  export ({ format }) {
    return action('export', { format })
  },
}
