<script lang="ts">
  import Flash from '#app/lib/components/flash.svelte'
  import { screen } from '#app/lib/components/stores/screen'
  import { icon } from '#app/lib/icons'
  import SelectDropdown from '#components/select_dropdown.svelte'
  import Spinner from '#components/spinner.svelte'
  import InventoryBrowserFacet from '#inventory/components/inventory_browser_facet.svelte'
  import InventoryBrowserTextFilter from '#inventory/components/inventory_browser_text_filter.svelte'
  import { I18n, i18n } from '#user/lib/i18n'

  export let waitForInventoryData, facetsSelectors, facetsSelectedValues, intersectionWorkUris, textFilterItemsIds, inventoryDisplay, frozenDisplay

  const displayOptions = [
    { value: 'cascade', icon: 'th-large', text: I18n('cascade') },
    { value: 'table', icon: 'align-justify', text: I18n('table') },
  ]

  let wrapped = true
  const smallScreenThreshold = 1000
  $: showControls = $screen.isLargerThan(smallScreenThreshold - 1) || !wrapped

  let flash
</script>

<div class="wrapper" class:unwrapped={showControls}>
  {#if $screen.isSmallerThan(smallScreenThreshold)}
    <button
      class="toggle-controls"
      on:click={() => wrapped = !wrapped}
      aria-controls="inventory-browser-controls"
    >
      {@html icon('cog')}
      {i18n('Advanced options')}
      {#if showControls}
        {@html icon('caret-up')}
      {:else}
        {@html icon('caret-down')}
      {/if}
    </button>
  {/if}

  <div
    id="inventory-browser-controls"
    class="controls"
    class:ready={facetsSelectors != null}
  >
    {#if showControls}
      <div class="filters">
        <span class="control-label">{I18n('filters')}</span>
        {#await waitForInventoryData}
          <Spinner center={true} />
        {:then}
          {#if facetsSelectors}
            <div class="selectors">
              {#each Object.keys(facetsSelectors) as sectionName}
                <InventoryBrowserFacet
                  bind:facetsSelectors
                  bind:facetsSelectedValues
                  {sectionName}
                  {intersectionWorkUris}
                />
              {/each}
            </div>
          {/if}
          <div class="text-filter">
            <InventoryBrowserTextFilter
              bind:textFilterItemsIds
              bind:flash
            />
          </div>
        {/await}
      </div>
      {#if !frozenDisplay}
        <div class="display-controls">
          <SelectDropdown
            bind:value={$inventoryDisplay}
            options={displayOptions}
            buttonLabel={I18n('display_mode')}
            hideCurrentlySelectedOption={true}
          />
        </div>
      {/if}
    {/if}
  </div>

  <Flash state={flash} />
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .wrapper{
    @include display-flex(column, stretch);
    margin-block-start: 0.5em;
    &:not(.unwrapped){
      .toggle-controls{
        align-self: flex-end;
        margin-inline-end: 0.5em;
      }
    }
    &.unwrapped{
      background-color: $inventory-nav-grey;
      .toggle-controls{
        position: absolute;
        margin: 0.5em 0.5em 0 0;
        align-self: flex-end;
      }
    }
  }
  .display-controls{
    flex: 0 0 auto;
    @include display-flex(row, center, flex-start);
    :global(.select-dropdown){
      @include display-flex(row, center, flex-start);
    }
    :global(.select-dropdown-label){
      font-size: 1rem;
    }
    :global(label){
      margin: 0 0.5em;
    }
  }
  .toggle-controls{
    z-index: 10;
    @include display-flex(row, center, center);
    @include bg-hover($off-white);
    @include radius;
    padding: 0.5em;
    color: $grey;
    :global(.fa){
      font-size: 1.4rem;
      padding: 0;
      margin: 0;
    }
  }
  .controls:not(:empty), .filters{
    @include radius;
  }
  .controls:not(:empty){
    @include transition(opacity);
    opacity: 1;
    margin: 0.5em 0;
  }
  .control-label{
    color: $grey;
  }

  /* Small screens */
  @media screen and (width < $small-screen){
    .controls{
      flex-direction: column;
    }
    .control-label{
      margin-inline-start: 0.5em;
    }
    .filters{
      flex-direction: column;
      margin: 1em;
    }
    .selectors{
      flex-direction: column;
    }
    .display-controls{
      margin: 1em;
    }
    .text-filter{
      margin: 1em 0;
    }
  }

  /* Large screens */
  @media screen and (width >= $small-screen){
    .controls:not(:empty), .filters{
      @include display-flex(row, center, center);
      padding: 0.2em 0.5em 0.2em 0.2em;
    }
    .selectors{
      @include display-flex(row, center, center);
    }
    .text-filter{
      margin-inline: 0.2em 1em;
    }
    .display-controls{
      margin-inline-start: auto;
      :global(.select-dropdown){
        @include display-flex(row, center, center);
      }
      :global(.select-dropdown-label){
        margin-inline-end: 0.5em;
      }
    }
    .control-label{
      margin: 0.5em;
    }
  }
</style>
