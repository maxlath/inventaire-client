import app from '#app/app'
import assert_ from '#app/lib/assert_types'
import { isModel, isShelfId } from '#app/lib/boolean_tests'
import { newError } from '#app/lib/error'
import { getById, getShelfMetadata } from './lib/shelves.ts'

export default {
  initialize () {
    const Router = Marionette.AppRouter.extend({
      appRoutes: {
        'shelves/without(/)': 'showItemsWithoutShelf',
        'shelves/(:id)/followers(/)': 'showShelfFollowers',
        'shelves(/)(:id)(/)': 'showShelfFromId',
        // Redirection
        'shelf(/)(:id)(/)': 'showShelfFromId',
      },
    })

    new Router({ controller })

    app.commands.setHandlers({
      'show:shelf': showShelf,
    })
  },
}

async function showShelfFromId (shelfId) {
  try {
    assert_.string(shelfId)
    const shelf = await getById(shelfId)
    if (shelf != null) {
      return showShelf(shelf)
    } else {
      throw newError('not found', 404, { shelfId })
    }
  } catch (err) {
    app.execute('show:error', err)
  }
}

const controller = {
  showShelfFromId,
  showShelfFollowers,
  async showItemsWithoutShelf () {
    const pathname = 'shelves/without'
    if (app.request('require:loggedIn', pathname)) {
      const { default: UsersHomeLayout } = await import('#users/components/users_home_layout.svelte')
      // Passing shelf to display items and passing owner for user profile info
      app.layout.showChildComponent('main', UsersHomeLayout, {
        props: {
          user: app.user.toJSON(),
          shelf: 'without-shelf',
        },
      })
      app.navigate('shelves/without')
    }
  },
}

async function showShelf (shelf) {
  if (isShelfId(shelf)) return controller.showShelfFromId(shelf)
  if (isModel(shelf)) shelf = shelf.toJSON()
  const { owner } = shelf
  const [
    { default: UsersHomeLayout },
    user,
  ] = await Promise.all([
    import('#users/components/users_home_layout.svelte'),
    app.request('resolve:to:user', owner),
  ])
  // Passing shelf to display items and passing owner for user profile info
  app.layout.showChildComponent('main', UsersHomeLayout, {
    props: {
      shelf,
      user,
    },
  })
  const metadata = getShelfMetadata(shelf)
  const { url: pathname } = metadata
  app.navigate(pathname, { metadata })
}

async function showShelfFollowers (shelfId) {
  try {
    const [
      { default: UsersHomeLayout },
      shelf,
    ] = await Promise.all([
      import('#users/components/users_home_layout.svelte'),
      getById(shelfId),
    ])
    const user = await app.request('resolve:to:user', shelf.owner)
    app.layout.showChildComponent('main', UsersHomeLayout, {
      props: {
        shelf,
        user,
        showShelfFollowers: true,
      },
    })
  } catch (err) {
    app.execute('show:error', err)
  }
}
