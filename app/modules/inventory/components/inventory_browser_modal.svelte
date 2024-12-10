<script lang="ts">
  import { onChange } from '#app/lib/svelte/svelte'
  import Modal from '#components/modal.svelte'
  import InventoryBrowser from '#inventory/components/inventory_browser.svelte'
  import { getInventoryView } from '#inventory/components/lib/inventory_browser_helpers'

  export let user
  export let group
  export let isMainUser = false
  export let showModal = false

  let itemsDataPromise

  function closeModal () {
    showModal = false
    user = null
    group = null
  }

  $: onChange(user, () => updateInventoryViewPromise({ user }))
  $: onChange(group, () => updateInventoryViewPromise({ group }))

  function updateInventoryViewPromise ({ user, group }) {
    if (!(user || group)) return
    if (user) {
      itemsDataPromise = getInventoryView('user', user)
    } else if (group) {
      itemsDataPromise = getInventoryView('group', group)
    }
  }
</script>

{#if user || group}
  <Modal size="large" on:closeModal={closeModal}>
    <InventoryBrowser
      {itemsDataPromise}
      ownerId={user?._id}
      groupId={group?._id}
      {isMainUser}
    />
  </Modal>
{/if}
