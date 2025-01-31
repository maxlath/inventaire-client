<script lang="ts">
  import app from '#app/app'
  import Flash from '#app/lib/components/flash.svelte'
  import { onChange } from '#app/lib/svelte/svelte'
  import Spinner from '#components/spinner.svelte'
  import InventoryBrowserModal from '#inventory/components/inventory_browser_modal.svelte'
  import GroupMarker from '#map/components/group_marker.svelte'
  import LeafletMap from '#map/components/leaflet_map.svelte'
  import Marker from '#map/components/marker.svelte'
  import UserMarker from '#map/components/user_marker.svelte'
  import ZoomInToDisplayMore from '#map/components/zoom_in_to_display_more.svelte'
  import { getBbox, isMapTooZoomedOut } from '#map/lib/map'
  import { i18n } from '#user/lib/i18n'
  import { getBrowserLocalLang } from '#user/lib/solve_lang'
  import { getDocsByPosition } from '#users/components/lib/public_users_nav_helpers'

  export let items = []
  let users = [], groups = [], selectedUser, selectedGroup

  // Arbitrary position (Lyon, France),
  // to not ask to geolocate as soon as landing on the page.
  const landingPageMapPosition = [ 45.744, 4.821 ]
  let map, mapZoom = 13, bbox, flash, displayedElementsCount
  let zoomInToDisplayMore = false

  const waitingForUsers = fetchItemsUsersAndGroups()

  async function fetchItemsUsersAndGroups () {
    if (!map) return
    displayedElementsCount = users.length + groups.length

    if (isMapTooZoomedOut(mapZoom, displayedElementsCount)) return
    bbox = getBbox(map)
    if (!bbox) return

    const lang = getBrowserLocalLang();
    ([ { users, items }, groups ] = await Promise.all([
      app.request('items:getByBbox', { items, bbox, lang })
        .catch(err => {
          if (err.message !== 'no items found') flash = err
        }),
      getDocsByPosition('groups', bbox),
    ]))
    if (items.length === 0) {
      flash = {
        type: 'warning',
        message: i18n('No public book books in this area'),
      }
    } else { flash = null }
  }

  $: onChange(map, fetchItemsUsersAndGroups)
</script>

<section>
  <h3>{i18n('Users and groups in the area')}</h3>
  <div id="mapContainer">
    <LeafletMap
      view={landingPageMapPosition}
      bind:map
      cluster={true}
      bind:zoom={mapZoom}
      on:moveend={fetchItemsUsersAndGroups}
      showLocationSearchInput={true}
      showFindPositionFromGeolocation={true}
    >
      {#await waitingForUsers}
        <Spinner />
      {:then}
        {#if users && !zoomInToDisplayMore}
          {#each users as user (user._id)}
            <Marker latLng={user.position} standalone={user.isMainUser}>
              <UserMarker
                doc={user}
                on:select={() => selectedUser = user}
              />
            </Marker>
          {/each}
        {/if}

        {#if groups && !zoomInToDisplayMore}
          {#each groups as group (group._id)}
            <Marker latLng={group.position}>
              <GroupMarker
                doc={group}
                on:select={() => selectedGroup = group}
              />
            </Marker>
          {/each}
        {/if}

        <ZoomInToDisplayMore
          {mapZoom}
          {displayedElementsCount}
          bind:zoomInToDisplayMore
        />
      {/await}
    </LeafletMap>
  </div>
  <Flash state={flash} />
</section>

<InventoryBrowserModal
  user={selectedUser}
  group={selectedGroup}
/>

<style lang="scss">
  @import "#welcome/scss/welcome_layout_commons";

  section{
    background-color: $off-white;
    overflow: hidden;
    max-height: 100vh;
    overflow-y: hidden;
    position: relative;
  }

  #mapContainer{
    height: 50vh;
    z-index: 0;
    @include display-flex(row, center, center);
    background-color: $off-white;
    position: relative;
    :global(.items-count), :global(.group-admin-badge), :global(.members-count){
      position: absolute;
      background-color: white;
      color: $dark-grey;
      line-height: 0;
      min-width: 1em;
    }
    :global(.items-count), :global(.members-count){
      inset-block-start: 0;
      inset-inline-end: 0;
      text-align: center;
      padding: 0.2em 0;
      border-end-start-radius: $global-radius;
      @include transition;
    }
    :global(.group-admin-badge){
      inset-block-start: 0;
      inset-inline-start: 0;
      // Somehow centers the icon vertically
      line-height: 0;
      border-end-end-radius: $global-radius;
    }
  }

  /* Large screens */
  @media screen and (width >= $smaller-screen){
    section{
      padding: 0 1em;
    }
  }
  // Do not override item_card style
  h3:not(.title){
    text-align: center;
    font-size: 1.2em;
    margin-block-start: 0.5em;
  }
</style>
