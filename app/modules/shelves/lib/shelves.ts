import { pluck } from 'underscore'
import { API } from '#app/api/api'
import app from '#app/app'
import assert_ from '#app/lib/assert_types'
import { getColorHexCodeFromModelId, getColorSquareDataUri } from '#app/lib/images'
import preq, { treq } from '#app/lib/preq'
import { getVisibilitySummary, getVisibilitySummaryLabel, visibilitySummariesData } from '#general/lib/visibility'
import type { ShelvesByIdsResponse } from '#server/controllers/shelves/by_ids'
import type { ShelvesByOwnersResponse } from '#server/controllers/shelves/by_owners'
import type { Shelf } from '#server/types/shelf'
import type { UserId } from '#server/types/user'

export function getById (id) {
  return preq.get(API.shelves.byIds(id))
  .then(getShelf)
}

export async function getShelvesByIds (ids) {
  if (ids.length === 0) return []
  const { shelves } = await treq.get<ShelvesByIdsResponse>(API.shelves.byIds(ids))
  return Object.values(shelves).sort(byName)
}

export async function createShelf (params) {
  const { shelf } = await preq.post(API.shelves.create, params)
  return shelf
}

export async function updateShelf (params) {
  try {
    const { shelf } = await preq.post(API.shelves.update, params)
    return shelf
  } catch (err) {
    if (err.message !== 'nothing to update') {
      throw err
    }
  }
}

export function deleteShelf (params) {
  return preq.post(API.shelves.delete, params)
}

export function removeItemsFromShelf ({ shelfId, items }) {
  const itemsIds = pluck(items, '_id')
  return shelfActionReq(shelfId, itemsIds, 'removeItems')
}

export function addItemsToShelf ({ shelfId, items }) {
  const itemsIds = pluck(items, '_id')
  return shelfActionReq(shelfId, itemsIds, 'addItems')
}

export async function addItemsByIdsToShelf ({ shelfId, itemsIds }) {
  return shelfActionReq(shelfId, itemsIds, 'addItems')
}

export async function getShelvesByOwner (userId: UserId) {
  assert_.string(userId)
  const { shelves } = await treq.get<ShelvesByOwnersResponse>(API.shelves.byOwners(userId))
  return Object.values(shelves).sort(byName)
}

export async function countShelves (userId: UserId) {
  const { shelves } = await treq.get<ShelvesByOwnersResponse>(API.shelves.byOwners(userId))
  return Object.keys(shelves).length
}

const shelfActionReq = (id, itemsIds, action) => {
  return preq.post(API.shelves[action], { id, items: itemsIds })
  .then(getShelf)
}

const getShelf = ({ shelves }) => Object.values(shelves)[0] as Shelf

export function serializeShelf (shelf) {
  const { _id, visibility } = shelf
  let { color } = shelf
  color = color || getColorHexCodeFromModelId(_id)
  Object.assign(shelf, {
    pathname: `/shelves/${_id}`,
    picture: getColorSquareDataUri(color),
    isEditable: shelf.owner === app.user.id,
  })
  if (visibility) {
    const visibilitySummary = getVisibilitySummary(visibility)
    Object.assign(shelf, {
      iconData: visibilitySummariesData[visibilitySummary],
      iconLabel: getVisibilitySummaryLabel(visibility),
    })
  }
  return shelf
}

export function getShelfMetadata (shelf) {
  const { _id: shelfId, name, description, picture, pathname } = serializeShelf(shelf)
  return {
    title: name,
    description,
    image: picture,
    url: pathname,
    rss: API.feeds('shelf', shelfId),
  }
}

const byName = (a, b) => normalizeName(a.name) > normalizeName(b.name) ? 1 : -1

const normalizeName = name => name.toLowerCase()
