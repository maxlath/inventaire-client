<!-- Update member list after leaving group -->
<script lang="ts">
  import { tick } from 'svelte'
  import { debounce } from 'underscore'
  import { API } from '#app/api/api'
  import app from '#app/app'
  import Flash from '#app/lib/components/flash.svelte'
  import { imgSrc } from '#app/lib/handlebars_helpers/images'
  import { userContent } from '#app/lib/handlebars_helpers/user_content'
  import { icon } from '#app/lib/icons'
  import { isOpenedOutside, loadInternalLink } from '#app/lib/utils'
  import Spinner from '#components/spinner.svelte'
  import GroupActions from '#groups/components/group_actions.svelte'
  import { getCachedSerializedGroupMembers, getAllGroupMembersIds, serializeGroup } from '#groups/lib/groups'
  import InventoryBrowser from '#inventory/components/inventory_browser.svelte'
  import { getInventoryView } from '#inventory/components/lib/inventory_browser_helpers'
  import UsersListings from '#listings/components/users_listings.svelte'
  import { i18n, I18n } from '#user/lib/i18n'
  import ProfileNav from '#users/components/profile_nav.svelte'
  import UserProfile from '#users/components/user_profile.svelte'
  import UsersHomeSectionList from '#users/components/users_home_section_list.svelte'

  export let group
  export let profileSection = null
  export let standalone = false
  export let focusedSection

  let members, flash

  const waitForMembers = getCachedSerializedGroupMembers(group)
    .then(users => members = users)
    .catch(err => flash = err)

  const { _id: groupId, name, description, requested } = group
  let settingsPathname, mainUserIsMember, mainUserIsAdmin, picture
  $: ({ settingsPathname, mainUserIsMember, mainUserIsAdmin, picture } = serializeGroup(group))

  function showMembersMenu (e) {
    if (isOpenedOutside(e)) return
    app.execute('show:group:board', group, { openedSection: 'groupInvite' })
    e.preventDefault()
  }

  let selectedMember, groupProfileEl
  function onSelectMember (e) {
    selectedMember = e.detail.doc
    $focusedSection = { type: 'user' }
  }

  async function onFocus () {
    if (!groupProfileEl) await tick()
    // Let app.navigate scroll to the page top when GroupProfile
    // is already at the top itself (standalone mode), to make the UsersHomeNav visible
    const pageSectionElement = standalone ? null : groupProfileEl
    let pathname, title, rss
    if (profileSection === 'inventory') {
      pathname = group.inventoryPathname
      title = `${name} - ${i18n('Inventory')}`
      rss = API.feeds('group', groupId)
    } else if (profileSection === 'listings') {
      pathname = group.listingsPathname
      title = `${name} - ${I18n('lists')}`
    } else {
      pathname = group.pathname
      title = name
      rss = API.feeds('group', groupId)
    }
    const metadata = {
      title,
      description,
      image: picture,
      rss,
    }
    app.navigate(pathname, { pageSectionElement, metadata })
  }
  const debouncedOnFocus = debounce(onFocus, 200, true)

  $: if ($focusedSection.type === 'group') debouncedOnFocus()
</script>

<div class="full-group-profile">
  <div class="group-profile" bind:this={groupProfileEl}>
    <div class="group-profile-header">
      <div class="section-one">
        <div class="cover-header">
          {#if picture}
            <img class="cover-image" src={imgSrc(picture, 1600)} alt="" />
          {/if}
          <div class="info">
            <span class="name">{name}</span>
          </div>
          <div class="icon-buttons">
            {#if mainUserIsMember}
              <a
                class="show-group-settings"
                href={settingsPathname}
                title={i18n('settings')}
                on:click={loadInternalLink}
              >
                {@html icon('cog')}
                {#if mainUserIsAdmin && requested.length > 0}
                  <span class="counter">{requested.length}</span>
                {/if}
              </a>
            {/if}
          </div>
        </div>
        {#if description}
          <p class="description">{@html userContent(description)}</p>
        {/if}
      </div>

      <div class="section-two">
        <div class="list-label-wrapper">
          <p class="list-label">{I18n('members')}</p>
          {#if mainUserIsMember}
            <a
              class="show-members-menu tiny-button light-blue"
              href={settingsPathname}
              on:click={showMembersMenu}
            >
              {@html icon('plus')}
              {i18n('invite')}
            </a>
          {/if}
        </div>
        <div class="members-list">
          {#await waitForMembers}
            <Spinner />
          {:then}
            <UsersHomeSectionList
              docs={members}
              type="members"
              {group}
              on:select={onSelectMember}
            />
          {/await}
        </div>
      </div>
    </div>

    <div class="group-actions">
      <GroupActions bind:group />
    </div>
  </div>

  <Flash state={flash} />

  {#if selectedMember}
    <!-- Recreate component when selectedMember changes, see https://svelte.dev/docs#template-syntax-key -->
    {#key selectedMember}
      <UserProfile user={selectedMember} {groupId} {focusedSection} />
    {/key}
  {:else}
    <ProfileNav {group} bind:profileSection {focusedSection} />
    {#if profileSection === 'listings'}
      <UsersListings usersIds={getAllGroupMembersIds(group)} />
    {:else}
      <InventoryBrowser
        itemsDataPromise={getInventoryView('group', group)}
        {groupId}
      />
    {/if}
  {/if}
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .full-group-profile{
    // Make sure it is possible to scroll to put the group profile at the top of the viewport
    min-height: 100vh;
  }
  .group-profile{
    background-color: #eee;
    margin: 0.5em 0;
  }
  .section-one{
    flex: 1 0 auto;
  }
  .cover-header{
    max-width: 100%;
    @include display-flex(column, center, center);
    height: 18em;
    position: relative;
  }
  .icon-buttons{
    @include position(absolute, 3px, 3px);
    @include display-flex(column, center, space-between);
    @include radius;
    font-size: 1.4em;
    a{
      padding: 0.3em;
      @include bg-hover($coverTextBg);
      :global(.fa){
        color: white;
        width: 2em;
        text-align: center;
      }
    }
  }
  .info{
    // Somehow needed to make it appear above group-cover-picture and picture-color-filter
    position: relative;
    align-self: stretch;
    @include display-flex(column, center, center);
    color: white;
    :global(.fa){
      color: white;
    }
    flex: 1;
  }
  .cover-image{
    @include position(absolute, 0, 0, 0, 0);
  }
  .section-two{
    flex: 2 0 auto;
  }
  .show-group-settings{
    position: relative;
    .counter{
      @include counter-commons;
      @include position(absolute, 2px, 2px);
      font-size: 1rem;
      line-height: 1.1rem;
    }
  }
  .description{
    padding: 0.5em;
    overflow: auto;
  }
  .show-members-menu{
    margin: 0 1em;
  }
  .members-list{
    max-height: 20em;
    overflow: auto;
  }
  .name{
    text-align: center;
    font-size: 1.5em;
    @include text-wrap;
    max-width: 100%;
    color: white;
    margin: auto;
    font-weight: bold;
    @include serif;
    padding: 0.5em 1em;
    @include radius;
    background-color: rgba($dark-grey, 0.9);
  }
  .group-actions{
    :global(button){
      margin-block: 1em;
    }
    :global(.requested){
      text-align: center;
      opacity: 0.8;
    }
  }

  .list-label-wrapper{
    @include display-flex(row, flex-end, space-between);
    padding: 0.5em 0;
  }

  /* Small screens */
  @media screen and (width < $small-screen){
    .group-profile{
      @include display-flex(column, stretch, center);
    }
    .section-two{
      padding: 1em;
    }
    .members-list{
      :global(.users-home-section-list){
        justify-content: flex-start;
      }
    }
    .description{
      max-height: 10em;
      padding: 0.5em;
    }
    .list-label{
      margin-block-end: 0.5em;
      font-size: 1.2em;
    }
    .list-label-wrapper{
      text-align: center;
      @include display-flex(column, center, center);
      flex-direction: column;
    }
  }

  /* Large screens */
  @media screen and (width >= $small-screen){
    .group-profile-header{
      @include display-flex(row, flex-start, space-between);
    }
    .section-one{
      flex: 1 0 20em;
      max-width: 50%;
    }
    .section-two{
      flex: 5 0 0;
      .list-label{
        text-align: end;
        margin: 0.5em 1em;
      }
    }
    .group-actions{
      @include display-flex(column, center, center);
      margin-block-start: 1em;
      :global(.restrictions){
        margin-block-start: 1em;
      }
    }
    .members-list{
      margin-inline-start: 0.8em;
    }
  }

  /* Very Large screens */
  @media screen and (width >= 1200px){
    .section-two{
      max-width: 70vw;
    }
  }
</style>
