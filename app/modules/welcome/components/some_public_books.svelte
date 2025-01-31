<script lang="ts">
  import app from '#app/app'
  import { isNonEmptyArray } from '#app/lib/boolean_tests'
  import { screen } from '#app/lib/components/stores/screen'
  import Spinner from '#components/spinner.svelte'
  import ItemsCascade from '#inventory/components/items_cascade.svelte'
  import ItemsTable from '#inventory/components/items_table.svelte'
  import { i18n } from '#user/lib/i18n'

  export let items = []

  const params = {
    lang: app.user.lang,
    assertImage: true,
    items: [],
  }

  const waiting = app.request('items:getRecentPublic', params)
    .catch(err => {
      if (err.message !== 'no item found') throw err
    })
</script>
{#if isNonEmptyArray(items)}
  <section>
    <h3>{i18n('Some books in this area')}</h3>
    {#if $screen.isSmallerThan('$smaller-screen')}
      <ItemsTable {items} haveSeveralOwners={true} />
    {:else}
      <ItemsCascade {items} />
    {/if}
    <div class="fade-out" />
  </section>
{:else}
  {#await waiting}
    <Spinner />
  {:then}
    {#if isNonEmptyArray(params.items)}
      <section>
        <h3>{i18n('Some of the last books listed')}</h3>
        {#await waiting}
          <Spinner center={true} />
        {:then}
          {#if $screen.isSmallerThan('$smaller-screen')}
            <ItemsTable items={params.items} {waiting} haveSeveralOwners={true} />
          {:else}
            <ItemsCascade items={params.items} {waiting} />
          {/if}
        {/await}
        <div class="fade-out" />
      </section>
    {/if}
  {/await}
{/if}

<style lang="scss">
  @import "#welcome/scss/welcome_layout_commons";

  section{
    background-color: $off-white;
    overflow: hidden;
    max-height: 150vh;
    overflow-y: hidden;
    position: relative;
  }
  .fade-out{
    position: absolute;
    inset-block-end: 0;
    inset-inline: 0;
    background: linear-gradient(0deg, $off-white, 50%, transparent);
    height: 5em;
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
