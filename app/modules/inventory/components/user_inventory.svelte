<script lang="ts">
  import { indexBy } from 'underscore'
  import { onChange } from '#app/lib/svelte/svelte'
  import InventoryBrowser from '#inventory/components/inventory_browser.svelte'
  import { getInventoryView } from '#inventory/components/lib/inventory_browser_helpers'
  import ShelfBox from '#shelves/components/shelf_box.svelte'
  import ShelvesSection from '#shelves/components/shelves_section.svelte'
  import { getShelvesByOwner } from '#shelves/lib/shelves'

  export let user
  export let selectedShelf = null
  export let groupId = null
  export let flash
  export let focusedSection
  export let showFollowers

  const { isMainUser } = user

  function onSelectShelf (e) {
    selectedShelf = e.detail.shelf
    $focusedSection = { type: 'shelf' }
  }
  function onCloseShelf () {
    selectedShelf = null
    $focusedSection = { type: 'user' }
  }

  let shelves, itemsShelvesByIds
  const waitForShelves = getShelvesByOwner(user._id)
    .then(res => {
      shelves = res
      if (selectedShelf && selectedShelf !== 'without-shelf') {
        // Replace the shelf object passed by the parent component by the one in the shelves array
        // so that changes made in the ShelfBox propagate to the ShelvesSection
        selectedShelf = shelves.find(({ _id }) => _id === selectedShelf._id)
      }
    })
    .catch(err => flash = err)

  // Required to propagate changes done on the selected shelf
  function refreshShelves () {
    shelves = shelves
  }
  $: onChange(selectedShelf, refreshShelves)
  $: if (shelves) itemsShelvesByIds = indexBy(shelves, '_id')
</script>

<ShelvesSection
  {waitForShelves}
  {user}
  {shelves}
  on:selectShelf={onSelectShelf}
/>

{#if selectedShelf === 'without-shelf'}
  <ShelfBox
    withoutShelf={true}
    on:closeShelf={onCloseShelf}
    {user}
    {itemsShelvesByIds}
    {focusedSection}
    on:selectShelf={onSelectShelf}
  />
{:else if selectedShelf}
  <ShelfBox
    bind:shelf={selectedShelf}
    on:closeShelf={onCloseShelf}
    {user}
    {itemsShelvesByIds}
    {focusedSection}
    on:selectShelf={onSelectShelf}
    {showFollowers}
  />
{:else}
  <InventoryBrowser
    itemsDataPromise={getInventoryView('user', user)}
    ownerId={user._id}
    {groupId}
    {isMainUser}
    {itemsShelvesByIds}
    on:selectShelf={onSelectShelf}
  />
{/if}
