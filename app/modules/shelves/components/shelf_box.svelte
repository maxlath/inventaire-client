<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import ActorFollowers from '#activitypub/components/actor_followers.svelte'
  import { API } from '#app/api/api'
  import app from '#app/app'
  import { imgSrc } from '#app/lib/handlebars_helpers/images'
  import { icon } from '#app/lib/icons'
  import preq from '#app/lib/preq'
  import { BubbleUpComponentEvent, onChange } from '#app/lib/svelte/svelte'
  import Modal from '#components/modal.svelte'
  import InventoryBrowser from '#inventory/components/inventory_browser.svelte'
  import { getInventoryView } from '#inventory/components/lib/inventory_browser_helpers'
  import ShelfEditor from '#shelves/components/shelf_editor.svelte'
  import ShelfItemsAdder from '#shelves/components/shelf_items_adder.svelte'
  import { i18n, I18n } from '#user/lib/i18n'
  import { serializeShelfData } from './lib/shelves.ts'

  export let shelf = null
  export let withoutShelf = false
  export let user
  export let itemsShelvesByIds
  export let focusedSection
  export let showShelfFollowers

  let itemsCount, shelfBoxEl
  const { isMainUser, fediversable } = user
  let name, description, picture, iconData, iconLabel, isEditable, pathname, visibility = []
  function refreshData () {
    ;({ name, description, picture, iconData, iconLabel, isEditable, pathname, visibility } = serializeShelfData(shelf, withoutShelf))
  }
  $: onChange(shelf, refreshData)

  let showShelfEditor = false
  let showShelfItemsAdder = false
  let waitingForFollowersCount, followersCount

  const dispatch = createEventDispatcher()
  const closeShelf = () => dispatch('closeShelf')
  const bubbleUpComponentEvent = BubbleUpComponentEvent(dispatch)

  async function onFocus () {
    if (!shelfBoxEl) await tick()
    app.navigate(pathname, { pageSectionElement: shelfBoxEl })
  }

  function closeShelfAdder () {
    showShelfItemsAdder = false
    // Force to refresh the shelf items list
    shelf = shelf
  }

  function showFollowersModal () {
    showShelfFollowers = true
    app.navigate(`/shelves/${shelf._id}/followers`)
  }

  waitingForFollowersCount = getFollowersCount()

  async function getFollowersCount () {
    if (fediversable && visibility.includes('public')) {
      const name = `shelf-${shelf._id}`
      const res = await preq.get(API.activitypub.followers({ name }))
      followersCount = res.totalItems
    } else {
      followersCount = null
    }
  }

  function closeFollowersModal () {
    showShelfFollowers = false
    app.navigate(`/shelves/${shelf._id}`)
  }

  $: onChange(shelf, getFollowersCount)
  $: if ($focusedSection.type === 'shelf') onFocus()
</script>

<div class="full-shelf-box">
  <div class="shelf-box" bind:this={shelfBoxEl}>
    <div class="header">
      {#if withoutShelf}
        <div class="without-shelf-picture">...</div>
      {:else}
        <div class="picture" style:background-image="url({imgSrc(picture, 160)})" />
      {/if}
      <button
        class="close-shelf-small close-button"
        title={I18n('unselect shelf')}
        on:click={() => dispatch('closeShelf')}
      >
        {@html icon('close')}
      </button>
    </div>
    <div class="info-box">
      <div>
        <h3 class="name">{name}</h3>
        {#if shelf}
          <ul class="data">
            {#if itemsCount}
              <li>
                <span>{@html icon('book')}{i18n('books')}</span>
                <span class="count">{itemsCount}</span>
              </li>
            {/if}
            {#if visibility}
              <li id="listing" title={i18n('Visible by')}>
                {@html icon(iconData.icon)} {i18n(iconLabel)}
              </li>
            {/if}
            {#await waitingForFollowersCount then}
              {#if followersCount}
                <li class="followers-count">
                  <a href="/shelves/{shelf._id}/followers" on:click={showFollowersModal}>
                    <span>{@html icon('address-book')}{i18n('followers')}</span>
                    <span class="count">{followersCount}</span>
                  </a>
                </li>
              {/if}
            {/await}
          </ul>
        {/if}
        <p class="description">{description}</p>
      </div>
      <div class="actions">
        <button
          class="close-shelf close-button"
          title={I18n('unselect shelf')}
          on:click={closeShelf}
        >{@html icon('close')}</button>
        <div class="buttons">
          {#if isEditable}
            <button
              class="show-shelf-edit tiny-button light-blue"
              on:click={() => showShelfEditor = true}
            >
              {@html icon('pencil')}
              {I18n('edit shelf')}
            </button>
            <button
              class="tiny-button light-blue"
              on:click={() => showShelfItemsAdder = true}
              title={I18n('add books to this shelf')}
            >
              {@html icon('plus')} {I18n('add books')}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#if withoutShelf}
    <InventoryBrowser
      itemsDataPromise={getInventoryView('without-shelf')}
      {isMainUser}
    />
  {:else}
    <!-- Recreate the component when shelf changes, see https://svelte.dev/docs#template-syntax-key -->
    {#key shelf}
      <InventoryBrowser
        itemsDataPromise={getInventoryView('shelf', shelf)}
        {isMainUser}
        shelfId={shelf._id}
        {itemsShelvesByIds}
        on:selectShelf={bubbleUpComponentEvent}
      />
    {/key}
  {/if}
</div>

{#if showShelfEditor}
  <Modal on:closeModal={() => showShelfEditor = false}
  >
    <ShelfEditor
      bind:shelf
      inGlobalModal={false}
      on:shelfEditorDone={() => showShelfEditor = false}
    />
  </Modal>
{/if}

{#if showShelfItemsAdder}
  <Modal on:closeModal={closeShelfAdder}
  >
    <ShelfItemsAdder
      {shelf}
      on:shelfItemsAdderDone={closeShelfAdder}
    />
  </Modal>
{/if}

{#if showShelfFollowers}
  <Modal on:closeModal={closeFollowersModal}
  >
    <ActorFollowers
      actorName="shelf-{shelf._id}"
      actorLabel={shelf.name}
      standalone={true}
    />
  </Modal>
{/if}

<style lang="scss">
  @import "#general/scss/utils";
  .full-shelf-box{
    // Make sure it is possible to scroll to put the shelf box at the top of the viewport
    min-height: 100vh;
  }
  .shelf-box{
    margin: 0.5em 0 0;
    @include display-flex(row);
    background-color: $light-grey;
  }
  .picture{
    // TODO: shelf picture
    width: 10em;
    height: 10em;
  }
  .info-box{
    flex: 1;
    padding: 1em;
    @include display-flex(row, top, space-between);
    .name, .description{
      // make button unbreakable
      flex: 1 0 0;
    }
  }
  .actions{
    @include display-flex(column, flex-end);
  }
  .buttons{
    margin-block-start: 0.5em;
    @include display-flex(column, stretch, center);
    > button{
      @include display-flex(row, center, space-between);
      margin-block-end: 0.5em;
      line-height: 1.6rem;
      min-width: 10em;
    }
  }
  .show-shelf-edit{
    margin-inline-start: auto;
  }
  .data{
    @include display-flex(row, flex-start);
    color: #666;
    margin-block-end: 0.5em;
    li{
      margin-inline-end: 1em;
    }
  }
  .followers-count a{
    cursor: pointer;
    color: #666;
  }
  .count{
    padding-inline-start: 0.5em;
  }
  .close-shelf-small{
    display: none;
  }
  .close-button{
    font-size: 1.5rem;
    @include text-hover($grey, $dark-grey);
  }
  .without-shelf-picture{
    @include display-flex(row, center, center);
    font-size: 1.5rem;
    height: 3em;
    width: 3em;
    color: $grey;
  }
  /* Smaller screens */
  @media screen and (width < $smaller-screen){
    .shelf-box{
      @include display-flex(column, center, center);
    }
    .header{
      @include display-flex(row, top, center);
    }
    .picture{
      // TODO: shelf picture
      width: 3em;
      height: 3em;
      margin-block-start: 0.5em;
    }
    .close-shelf-small{
      padding: 0.5em 0.3em 0 0;
      position: absolute;
      inset-inline-end: 0.3em;
      display: block;
    }
    .name, .description{
      text-align: center;
    }
    .info-box{
      @include display-flex(column, center, center);
      padding: 0;
      margin-block-end: 0.7em;
    }
    .close-shelf{
      display: none;
    }
    .data{
      @include display-flex(column, center, center);
      li{
        margin: 0.2em 0;
      }
    }
  }
</style>
