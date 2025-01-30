import { compact, uniq } from 'underscore'
import app from '#app/app'
import { buildPath } from '#app/lib/location'
import mapConfig from './config.ts'
import { truncateDecimals } from './geo.ts'

const { defaultZoom } = mapConfig

export function updateRoute (root, lat, lng, zoom = defaultZoom) {
  lat = truncateDecimals(lat)
  lng = truncateDecimals(lng)
  // Keep only defined parameters in the route
  // Allow to pass a custom root to let it be used in multiple modules
  const route = buildPath(root, { lat, lng, zoom })
  app.navigate(route, { preventScrollTop: true })
}

export function updateMarker (marker, coords) {
  if (coords?.lat == null) return marker.remove()
  const { lat, lng } = coords
  return marker.setLatLng([ lat, lng ])
}

export function getBbox (map) {
  const { _southWest, _northEast } = map.getBounds()
  if (_southWest.lng === _northEast.lng || _southWest.lat === _northEast.lat) {
    return
  }
  return [ _southWest.lng, _southWest.lat, _northEast.lng, _northEast.lat ]
}

export function uniqBounds (bounds) {
  const stringifiedBounds = compact(bounds).map(stringifyBound)
  return uniq(stringifiedBounds).map(parseStringifiedBound)
}

const stringifyBound = bound => JSON.stringify(bound)
const parseStringifiedBound = stringifiedBound => JSON.parse(stringifiedBound)

export function isMapTooZoomedOut (mapZoom, displayedElementsCount) {
  if (mapZoom >= 10) return false
  if (!displayedElementsCount) return false
  return displayedElementsCount > 20
}
