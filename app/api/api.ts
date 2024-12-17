import { i18nContentHash } from '#assets/js/build_metadata'
import type { RelativeUrl } from '#server/types/common'
import activitypub from './activitypub.ts'
import auth from './auth.ts'
import data from './data.ts'
import { getEndpointBase } from './endpoint.ts'
import entities from './entities.ts'
import feeds from './feeds.ts'
import groups from './groups.ts'
import images from './images.ts'
import img from './img.ts'
import invitations from './invitations.ts'
import items from './items.ts'
import listings from './listings.ts'
import oauth from './oauth.ts'
import search from './search.ts'
import shelves from './shelves.ts'
import tasks from './tasks.ts'
import transactions from './transactions.ts'
import users from './users.ts'

export const API = {
  // /api endpoints
  activitypub,
  auth,
  config: getEndpointBase('config'),
  data,
  entities,
  feedback: getEndpointBase('feedback'),
  feeds,
  groups,
  i18n: getEndpointBase('i18n'),
  images,
  invitations,
  items,
  listings,
  notifications: getEndpointBase('notifications'),
  oauth,
  relations: getEndpointBase('relations'),
  search,
  shelves,
  tasks,
  tests: getEndpointBase('tests'),
  transactions,
  user: getEndpointBase('user'),
  users,

  // /public endpoints
  i18nStrings: lang => `/public/i18n/${lang}.json${getBuster()}` as RelativeUrl,
  json: filename => `/public/json/${filename}.json${getBuster()}` as RelativeUrl,

  // /img: endpoint serving images, handled by Nginx in production
  // thus not behing the /api root
  img,
}

const getBuster = () => {
  // TS2339: Property 'env' does not exist on type 'Window & typeof globalThis'.
  if (window.env === 'dev') return `?${Date.now()}`
  else return `?${i18nContentHash}`
}
