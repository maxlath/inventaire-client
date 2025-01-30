<script lang="ts">
  import Flash from '#app/lib/components/flash.svelte'
  import { wait } from '#app/lib/promises'
  import { onChange } from '#app/lib/svelte/svelte'
  import Spinner from '#components/spinner.svelte'
  import GroupProfile from '#groups/components/group_profile.svelte'
  import GroupMarker from '#map/components/group_marker.svelte'
  import LeafletMap from '#map/components/leaflet_map.svelte'
  import Marker from '#map/components/marker.svelte'
  import PositionRequired from '#map/components/position_required.svelte'
  import UserMarker from '#map/components/user_marker.svelte'
  import ZoomInToDisplayMore from '#map/components/zoom_in_to_display_more.svelte'
  import { getBbox, isMapTooZoomedOut } from '#map/lib/map'
  import { i18n, I18n } from '#user/lib/i18n'
  import { user } from '#user/user_store'
  import { getGroupsByPosition, getUsersByPosition } from '#users/components/lib/public_users_nav_helpers'
  import PaginatedSectionItems from '#users/components/paginated_section_items.svelte'
  import UserProfile from '#users/components/user_profile.svelte'
  import UsersHomeSectionList from '#users/components/users_home_section_list.svelte'

  export let filter = null
  export let focusedSection

  const showUsers = filter !== 'groups'
  const showGroups = filter !== 'users'

  let usersById = {}, groupsById = {}
  let map, bbox, mapViewLatLng, mapZoom, flash
  let zoomInToDisplayMore, displayedElementsCount

  const getByPosition = async (name, bbox) => {
    try {
      if (name === 'users') {
        usersById = await getUsersByPosition({ bbox })
        usersInBounds = Object.values(usersById)
      } else if (name === 'groups') {
        groupsById = await getGroupsByPosition({ bbox })
        groupsInBounds = Object.values(groupsById)
      }
    } catch (err) {
      flash = err
    }
  }

  let waitForUsers, waitForGroups
  function fetchAndShowUsersAndGroupsOnMap () {
    if (!map) return
    displayedElementsCount = usersInBounds.length + groupsInBounds.length
    if (isMapTooZoomedOut(mapZoom, displayedElementsCount)) return
    bbox = getBbox(map)
    if (!bbox) return

    if (showUsers) {
      waitForUsers = getByPosition('users', bbox)
    }

    if (showGroups) {
      waitForGroups = getByPosition('groups', bbox)
    }
  }

  async function onMainUserPositionChange () {
    const positionChanged = mapViewLatLng != null
    mapViewLatLng = $user.position
    if (positionChanged) {
      // Give the time to the server to save the new user position before refetching nearby users
      await wait(1000)
      fetchAndShowUsersAndGroupsOnMap()
    }
  }

  let usersInBounds, groupsInBounds

  $: onChange(map, fetchAndShowUsersAndGroupsOnMap)
  $: onChange($user.position, onMainUserPositionChange)
  $: onChange(mapZoom, usersInBounds, groupsInBounds)

  let selectedUser, selectedGroup
  function onSelectUser (e) {
    selectedUser = e.detail.doc
    selectedGroup = null
    $focusedSection = { type: 'user' }
  }

  function onSelectGroup (e) {
    selectedUser = null
    selectedGroup = e.detail.doc
    $focusedSection = { type: 'group' }
  }

</script>

{#if $user.position != null}
  <div class="map-lists-wrapper">
    <div class="lists">
      {#if showUsers}
        <div class="list-wrapper">
          <div class="list-header">
            <h2 class="list-label">{I18n('users')}</h2>
            {#await waitForUsers}
              <div class="usersLoading"><Spinner /></div>
            {/await}
          </div>
          {#if usersInBounds}
            <UsersHomeSectionList
              docs={usersInBounds}
              type="users"
              hideList={zoomInToDisplayMore}
              hideListMessage={i18n('Zoom-in to display more')}
              on:select={onSelectUser}
            />
          {/if}
        </div>
      {/if}

      {#if showGroups}
        <div class="list-wrapper">
          <div class="list-header">
            <h2 class="list-label">{I18n('groups')}</h2>
            {#await waitForGroups}
              <div class="groupsLoading"><Spinner /></div>
            {/await}
          </div>
          {#if groupsInBounds}
            <UsersHomeSectionList
              docs={groupsInBounds}
              type="groups"
              hideList={zoomInToDisplayMore}
              hideListMessage={i18n('Zoom-in to display more')}
              on:select={onSelectGroup}
            />
          {/if}
        </div>
      {/if}
    </div>

    <div id="mapContainer">
      {#if mapViewLatLng}
        <LeafletMap
          bind:map
          view={mapViewLatLng}
          bind:zoom={mapZoom}
          cluster={true}
          showLocationSearchInput={true}
          on:moveend={fetchAndShowUsersAndGroupsOnMap}
        >
          {#if usersInBounds && !zoomInToDisplayMore}
            {#each usersInBounds as user (user._id)}
              <Marker latLng={user.position} standalone={user.isMainUser}>
                <UserMarker doc={user} on:select={onSelectUser} />
              </Marker>
            {/each}
          {/if}

          {#if groupsInBounds && !zoomInToDisplayMore}
            {#each groupsInBounds as group (group._id)}
              <Marker latLng={group.position}>
                <GroupMarker doc={group} on:select={onSelectGroup} />
              </Marker>
            {/each}
          {/if}
          <ZoomInToDisplayMore
            {mapZoom}
            {displayedElementsCount}
            bind:zoomInToDisplayMore
          />

        </LeafletMap>
      {/if}
    </div>
  </div>

  {#if selectedUser}
    <!-- Recreate component when selectedUser changes, see https://svelte.dev/docs#template-syntax-key -->
    {#key selectedUser}
      <UserProfile user={selectedUser} {focusedSection} />
    {/key}
  {:else if selectedGroup}
    {#key selectedGroup}
      <GroupProfile group={selectedGroup} {focusedSection} />
    {/key}
  {:else}
    <!-- TODO: use bbox to update displayed items accordingly -->
    <PaginatedSectionItems
      sectionRequestName="items:getNearbyItems"
      showDistance={true}
    />
  {/if}
{:else}
  <PositionRequired />
{/if}

<Flash state={flash} />

<style lang="scss">
  @import "#general/scss/utils";
  @import "#users/scss/users_home_section_navs";

  .list-header{
    @include display-flex(row, center, space-between);
  }

  .usersLoading, .groupsLoading{
    margin-inline-start: 1em;
    opacity: 0.6;
  }

  .map-lists-wrapper{
    display: flex;
  }

  #mapContainer{
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

  /* Small screens */
  @media screen and (width < $small-screen){
    .lists{
      flex-direction: column;
    }
    .map-lists-wrapper{
      flex-direction: column;
    }
    #mapContainer{
      order: -1;
      height: 20em;
      max-height: 50vh;
    }
  }

  /* Large screens */
  @media screen and (width >= $small-screen){
    .map-lists-wrapper{
      > div{
        flex: 1 0 0;
      }
    }
    #mapContainer{
      margin-inline-start: 0.6em;
      height: $map-large-screen-heigth;
    }
  }
</style>
