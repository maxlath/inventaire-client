import app from '#app/app'
import type { Group } from '#server/types/group'
import type { UserId, User } from '#server/types/user'
import { i18n } from '#user/lib/i18n'
import { initRelations } from '#users/lib/relations'
import initHelpers from './helpers.ts'
import initRequests from './requests.ts'
import initUsersCollections from './users_collections.ts'

export default {
  initialize () {
    const Router = Marionette.AppRouter.extend({
      appRoutes: {
        'u(sers)(/)': 'showNetworkHome',
        'u(sers)/network(/)': 'showNetworkHome',
        'u(sers)/public(/)': 'showPublicHome',
        'u(sers)/latest(/)': 'showLatestUsers',
        'u(sers)/:id/followers(/)': 'showUserFollowers',
        'u(sers)/:id(/)': 'showUserProfile',
        'u(sers)/:id/inventory/:uri(/)': 'showUserItemsByEntity',
        'u(sers)/:id/inventory(/)': 'showUserInventory',
        'u(sers)/:id/lists(/)': 'showUserListings',
        'u(sers)/:id/contributions(/)': 'showUserContributionsFromRoute',
      },
    })

    new Router({ controller })

    app.users = initUsersCollections(app)
    initHelpers(app)
    initRequests(app)
    initRelations()

    app.commands.setHandlers({
      'show:user': app.Execute('show:inventory:user'),
      'show:user:contributions': showUserContributions,
    })

    app.reqres.setHandlers({
      // Refreshing relations can be useful
      // to refresh notifications counters that depend on app.relations
      'refresh:relations': initRelations,
    })
  },
}

export async function showHome () {
  if (app.request('require:loggedIn', app.user.get('inventoryPathname'))) {
    // Give focus to the home button so that hitting tab gives focus
    // to the search input
    $('#home').focus()
    return showMainUserProfile()
  }
}

export async function showUserProfile (user) {
  return showUsersHome({ user })
}

export async function showMainUserProfile () {
  return showUsersHome({ user: app.user })
}

export async function showUserInventory (user) {
  return showUsersHome({ user, profileSection: 'inventory' })
}

export async function showUserListings (user) {
  return showUsersHome({ user, profileSection: 'listings' })
}

async function showLatestUsers () {
  if (!app.request('require:admin:access')) return
  const { default: LatestUsers } = await import('#users/components/latest_users.svelte')
  app.layout.showChildComponent('main', LatestUsers)
  app.navigate('users/latest', { metadata: { title: i18n('Latest users') } })
}

const controller = {
  showHome,
  showNetworkHome () {
    const pathname = 'users/network'
    app.navigate('users/network')
    if (app.request('require:loggedIn', pathname)) {
      showUsersHome({ section: 'network' })
    }
  },
  showPublicHome () {
    const pathname = 'users/public'
    app.navigate(pathname)
    if (app.request('require:loggedIn', pathname)) {
      showUsersHome({ section: 'public' })
    }
  },
  showUserProfile,
  showUserInventory,
  showUserListings,
  showUserFollowers,
  showUserItemsByEntity (username, uri) {
    app.execute('show:user:items:by:entity', username, uri)
  },
  showUserContributionsFromRoute (idOrUsername) {
    const filter = app.request('querystring:get', 'filter')
    showUserContributions(idOrUsername, filter)
  },
  showLatestUsers,
}

interface ShowUsersHome {
  user?: UserId
  group?: string
  section?: 'public' | 'network'
  profileSection?: 'inventory' | 'listings'
}

interface UsersHomeLayoutProps{
  user?: User
  group?: Group
  section: 'public' | 'network'
  profileSection: 'inventory' | 'listings'
}

export async function showUsersHome ({ user, group, section, profileSection }: ShowUsersHome) {
  try {
    const { default: UsersHomeLayout } = await import('#users/components/users_home_layout.svelte')
    const props: UsersHomeLayoutProps = { section, profileSection }
    if (user) props.user = await app.request('resolve:to:user', user)
    if (group) props.group = await app.request('resolve:to:group', group)
    app.layout.showChildComponent('main', UsersHomeLayout, { props })
  } catch (err) {
    app.execute('show:error', err)
  }
}

async function showUserContributions (idOrUsernameOrModel, filter) {
  try {
    const user = await app.request('resolve:to:user', idOrUsernameOrModel)
    const { username } = user
    let path = `users/${username.toLowerCase()}/contributions`
    if (filter) path += `?filter=${filter}`
    const title = i18n('contributions_by', { username })
    app.navigate(path, { metadata: { title } })
    const { default: Contributions } = await import('#entities/components/patches/contributions.svelte')
    app.layout.showChildComponent('main', Contributions, { props: { user, filter } })
  } catch (err) {
    app.execute('show:error', err)
  }
}

async function showUserFollowers (username) {
  try {
    const { default: ActorFollowers } = await import('#activitypub/components/actor_followers.svelte')
    app.layout.showChildComponent('main', ActorFollowers, {
      props: {
        actorName: username,
        standalone: true,
      },
    })
  } catch (err) {
    app.execute('show:error', err)
  }
}
