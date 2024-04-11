import { API } from '#app/api/api'
import app from '#app/app'
import Entities from '#entities/entities'
import { initQuerystringActions } from '#general/lib/querystring_actions'
import AppLayout from '#general/views/app_layout'
import Groups from '#groups/groups'
import Add from '#inventory/add'
import Inventory from '#inventory/inventory'
import initDataWaiters from '#lib/data/waiters'
import initPiwik from '#lib/piwik'
import initQuerystringHelpers from '#lib/querystring_helpers'
import reloadOnceADay from '#lib/reload_once_a_day'
import Listings from '#listings/listings'
import Redirect from '#modules/redirect'
import Network from '#network/network'
import Notifications from '#notifications/notifications'
import Search from '#search/search'
import Settings from '#settings/settings'
import Shelves from '#shelves/shelves'
import Tasks from '#tasks/tasks'
import Transactions from '#transactions/transactions'
import User from '#user/user'
import Users from '#users/users'

export default async function () {
  // gets all the routes used in the app
  app.API = API

  initDataWaiters()

  // Initialize all the modules and their routes before app.start()
  // The first routes initialized have the lowest priority
  // /!\ routes defined before Redirect will be overriden by the glob
  Redirect.initialize()
  // other modules might need to access app.user so it should be initialized early on
  User.initialize()
  // Users and Entities need to be initialize for the Welcome item panel to work
  Users.initialize()
  Entities.initialize()
  Search.initialize()
  Add.initialize()
  Inventory.initialize()
  Transactions.initialize()
  Network.initialize()
  Groups.initialize()
  Notifications.initialize()
  Settings.initialize()
  Tasks.initialize()
  Shelves.initialize()
  Listings.initialize()
  initQuerystringHelpers()
  // Should be run before app start to access the unmodifed url
  initQuerystringActions()

  await app.request('wait:for', 'i18n')

  // Initialize the application on DOM ready event.
  $(() => {
    app.layout = new AppLayout()
    app.start()
    app.execute('waiter:resolve', 'layout')
    reloadOnceADay()
  })

  initPiwik()
}