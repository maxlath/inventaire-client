<script lang="ts">
  import Link from '#app/lib/components/link.svelte'
  import { onChange } from '#app/lib/svelte/svelte'
  import Modal from '#components/modal.svelte'
  import InventoryBrowser from '#inventory/components/inventory_browser.svelte'
  import { getInventoryView } from '#inventory/components/lib/inventory_browser_helpers'
  import { i18n } from '#user/lib/i18n'
  import UserInfobox from '#users/components/user_infobox.svelte'

  export let user
  export let group
  export let isMainUser = false
  export let showModal = false

  let itemsDataPromise, name, linkUrl, picture

  function closeModal () {
    showModal = false
    user = null
    group = null
  }

  $: onChange(user, () => updateModalData({ user }))
  $: onChange(group, () => updateModalData({ group }))

  function updateModalData ({ user, group }) {
    if (!(user || group)) return
    if (user) {
      itemsDataPromise = getInventoryView('user', user);
      ({ username: name, picture } = user)
      linkUrl = `/users/${name}`
    } else if (group) {
      itemsDataPromise = getInventoryView('group', group)
      name = group.name
      linkUrl = `/groups/${group.slug}`
    }
  }
</script>

{#if user || group}
  <div class="modal-wrapper">
    <Modal size="large" on:closeModal={closeModal}>
      <div class="header">
        <h2>
          {i18n('Public books')}
        </h2>
      </div>
      {#key name}
        {#if user}
          <UserInfobox
            {linkUrl}
            label={i18n('From user')}
            {name}
            {picture}
          />
        {:else if group}
          <span class="label">{i18n('From group')}</span>
          <Link
            url={linkUrl}
            text={name}
            classNames="link"
          />
        {/if}
      {/key}
      <InventoryBrowser
        {itemsDataPromise}
        ownerId={user?._id}
        groupId={group?._id}
        {isMainUser}
        frozenDisplay="table"
      />
    </Modal>
  </div>
{/if}

<style lang="scss">
  @import "#general/scss/utils";
  .modal-wrapper{
    :global(.modal-inner){
      min-width: 80vw;
      margin: 0 0.5em
    }
    .header{
      @include display-flex(column, center);
    }
    h2{
      font-weight: bold;
      margin-block-start: 1em;
      font-size: 1.4em;
    }
    .label{
      color: $label-grey;
      display: block;
    }
    :global(.link){
      display: block;
      padding: 0.5em;
      font-weight: bold;
      @include radius;
      @include bg-hover($light-grey);
    }
  }
</style>
