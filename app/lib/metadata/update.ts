// Metadata update is coupled to the needs of:
// - Browsers:
//   - document title update (which is important for the browser history)
//   - RSS feed detection
// - Prerender (https://github.com/inventaire/prerender), which itself aims to serve:
//   - search engines need status codes and redirection locations
//   - social media need metadata in different formats to show link previews:
//     - opengraph (https://ogp.me)
//     - twitter cards (https://developer.twitter.com/cards)
//   - other crawlers
//
// For all the needs covered by Prerender, only the first update matters,
// but further updates might be needed for in browser metadata access,
// such as RSS feed detections
import app from '#app/app'
import { wait } from '#lib/promises'
import { dropLeadingSlash } from '#lib/utils'
import { I18n, i18n } from '#user/lib/i18n'
import { transformers } from './apply_transformers.ts'
import updateNodeType from './update_node_type.ts'

// Make prerender wait before assuming everything is ready
// See https://prerender.io/documentation/best-practices
let prerenderReady = false
async function metadataUpdateDone () {
  await wait(100)
  prerenderReady = true
}
// Stop waiting if it takes more than 20 secondes: addresses cases
// where metadataUpdateDone would not have been called
setTimeout(metadataUpdateDone, 20 * 1000)
export const isPrerenderSession = (window.navigator.userAgent.match('Prerender') != null)

export async function updateRouteMetadata (route, metadataPromise = {}) {
  route = dropLeadingSlash(route)
  // metadataPromise can be a promise or a simple object
  const metadata = await metadataPromise
  if (Object.keys(metadata).length === 0) return
  applyMetadataUpdate(route, metadata)
  if (metadata?.title) metadataUpdateDone()
}

function applyMetadataUpdate (route, metadata = {}) {
  if (metadata.smallCardType) {
    metadata['twitter:card'] = 'summary'
    // Use a small image to force social media to display it small
    metadata.image = (metadata.image != null) ? app.API.img(metadata.image, 300, 300) : undefined
    delete metadata.smallCardType
  }

  if (metadata.title == null) metadata = getDefaultMetadata()
  if (!metadata.url) metadata.url = `/${route}`
  // image and rss can keep the default value, but description should be empty if no specific description can be found
  // to avoid just spamming with the default description
  if (metadata.description == null) metadata.description = ''
  updateMetadata(metadata)
}

export const getDefaultMetadata = () => ({
  url: '',
  title: 'Inventaire - ' + i18n('your friends and communities are your best library'),
  description: I18n('make the inventory of your books and mutualize with your friends and communities into an infinite library!'),
  image: 'https://inventaire.io/public/images/inventaire-books.jpg',
  rss: 'https://mamot.fr/users/inventaire.rss',
  'og:type': 'website',
  'twitter:card': 'summary_large_image',
})

function updateMetadata (metadata) {
  for (const key in metadata) {
    const value = metadata[key]
    updateNodeType(key, value)
  }
}

function setPrerenderMeta (statusCode = 500, route) {
  if (!isPrerenderSession || prerenderReady) return

  let prerenderMeta = `<meta name='prerender-status-code' content='${statusCode}'>`
  if (statusCode === 302 && route != null) {
    const fullUrl = transformers.url(route)
    // See https://github.com/prerender/prerender#httpheaders
    prerenderMeta += `<meta name='prerender-header' content='Location: ${fullUrl}'>`
  }

  $('head').append(prerenderMeta)
}

export function setPrerenderStatusCode (statusCode, route?) {
  setPrerenderMeta(statusCode, route)
  metadataUpdateDone()
}

export function clearMetadata () {
  prerenderReady = false
  updateMetadata(getDefaultMetadata())
  $('head meta[name^="prerender"]').remove()
}
