import { buildPath } from 'lib/location'
import endpoint from './endpoint'
const { root } = window.location
const feedEndpointBase = endpoint('feeds', true)
// Always using the absolute path so that links are treated as external links,
// thus getting target='_blank' attributes, and the associated click behaviors
// cf app/modules/general/lib/smart_prevent_default.coffee
const feedEndpoint = `${root}${feedEndpointBase}`

export default function (key, id) {
  const query = {}
  query[key] = id
  if (app.user.loggedIn) {
    query.requester = app.user.id
    query.token = app.user.get('readToken')
  }

  return buildPath(feedEndpoint, query)
}
