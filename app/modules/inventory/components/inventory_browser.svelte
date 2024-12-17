<script context="module" lang="ts">
  import type { GroupId } from '#server/types/group'
  import type { ShelfId } from '#server/types/shelf'
  import type { UserId } from '#server/types/user'

  export interface ItemsSearchFilters {
    ownerId?: UserId
    groupId?: GroupId
    shelfId?: ShelfId
  }
</script>
<script lang="ts">
  import { createEventDispatcher, setContext } from 'svelte'
  import { debounce } from 'underscore'
  import app from '#app/app'
  import Flash from '#app/lib/components/flash.svelte'
  import { BubbleUpComponentEvent, onChange } from '#app/lib/svelte/svelte'
  import Spinner from '#components/spinner.svelte'
  import InventoryBrowserControls from '#inventory/components/inventory_browser_controls.svelte'
  import InventoryWelcome from '#inventory/components/inventory_welcome.svelte'
  import { getFilteredItemsIds, getInventoryDisplayStore, getSelectorsData, resetPagination } from '#inventory/components/lib/inventory_browser_helpers'
  import PaginatedItems from '#inventory/components/paginated_items.svelte'
  import { getIntersectionWorkUris } from '#inventory/lib/browser/get_intersection_work_uris'

  export let itemsDataPromise
  export let isMainUser = false
  export let ownerId: UserId = null
  export let groupId: GroupId = null
  export let shelfId: ShelfId = null
  export let itemsShelvesByIds = null
  export let frozenDisplay = null

  const itemsSearchFilters: ItemsSearchFilters = { ownerId, groupId, shelfId }
  setContext('items-search-filters', itemsSearchFilters)

  let itemsIds, textFilterItemsIds, flash

  const inventoryDisplay = getInventoryDisplayStore(isMainUser)

  let showInventoryWelcome = false

  let worksTree, workUriItemsMap, itemsByDate
  const waitForInventoryData = itemsDataPromise
    .then(async res => {
      ;({ worksTree, workUriItemsMap, itemsByDate } = res)
      if (itemsByDate.length === 0 && ownerId === app.user.id) {
        showInventoryWelcome = true
      } else {
        await showEntitySelectors()
      }
    })
    .catch(err => flash = err)

  let facetsSelectors, facetsSelectedValues
  async function showEntitySelectors () {
    ;({ facetsSelectors, facetsSelectedValues } = await getSelectorsData({ worksTree }))
  }

  let intersectionWorkUris, pagination

  function updateDisplayedItems () {
    if (!(worksTree && facetsSelectedValues)) return
    intersectionWorkUris = getIntersectionWorkUris({ worksTree, facetsSelectedValues })
    itemsIds = getFilteredItemsIds({ intersectionWorkUris, itemsByDate, workUriItemsMap, textFilterItemsIds })
    pagination = resetPagination(itemsIds)
  }

  const lazyUpdateDisplayedItems = debounce(updateDisplayedItems, 100)

  $: onChange(facetsSelectedValues, textFilterItemsIds, lazyUpdateDisplayedItems)

  const dispatch = createEventDispatcher()
  const bubbleUpComponentEvent = BubbleUpComponentEvent(dispatch)
</script>

<Flash state={flash} />
{#if showInventoryWelcome}
  <InventoryWelcome />
{:else}
  <InventoryBrowserControls
    {waitForInventoryData}
    bind:facetsSelectors
    bind:facetsSelectedValues
    bind:textFilterItemsIds
    {intersectionWorkUris}
    {inventoryDisplay}
    {frozenDisplay}
  />
  {#await waitForInventoryData}
    <div class="spinner-wrap">
      <Spinner center={true} />
    </div>
  {:then}
    {#if pagination}
      <PaginatedItems
        display={frozenDisplay || $inventoryDisplay}
        {itemsIds}
        {itemsShelvesByIds}
        {shelfId}
        {isMainUser}
        {pagination}
        haveSeveralOwners={ownerId == null}
        on:selectShelf={bubbleUpComponentEvent}
      />
    {/if}
  {/await}
{/if}

<style lang="scss">
  @import "#general/scss/utils";
  .spinner-wrap{
    margin: 2em;
  }
</style>
