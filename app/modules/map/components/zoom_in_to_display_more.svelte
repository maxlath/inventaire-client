<script>
  import { onChange } from '#app/lib/svelte/svelte'
  import { isMapTooZoomedOut } from '#map/lib/map'
  import { i18n } from '#user/lib/i18n'

  export let mapZoom
  export let displayedElementsCount

  export let zoomInToDisplayMore = false
  function updateZoomStatus () {
    zoomInToDisplayMore = isMapTooZoomedOut(mapZoom, displayedElementsCount)
  }

  $: onChange(mapZoom, updateZoomStatus)
</script>

{#if zoomInToDisplayMore}
  <div class="zoom-in-overlay">
    <p>{i18n('Zoom-in to display more')}</p>
  </div>
{/if}

<style lang="scss">
  @import "#general/scss/utils";

  .zoom-in-overlay{
    background-color: rgba($dark-grey, 0.5);
    @include position(absolute, 0, 0, 0, 0);
    // Above map but below controls
    z-index: 400;
    @include display-flex(column, center, center);
  }
</style>
