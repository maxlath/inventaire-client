<script context="module">
  let openModalsCount = 0
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import app from '#app/app'
  import { autofocus } from '#app/lib/components/actions/autofocus'
  import { icon } from '#app/lib/icons'
  import { getActionKey } from '#app/lib/key_events'
  import { I18n } from '#user/lib/i18n'

  export let size = 'medium'

  const dispatch = createEventDispatcher()
  const close = () => dispatch('closeModal')

  function onKeyUp (e) {
    const key = getActionKey(e)
    if (key === 'esc') close()
  }

  onMount(() => {
    if (openModalsCount === 0) app.vent.trigger('overlay:shown')
    openModalsCount++
  })
  onDestroy(() => {
    openModalsCount--
    if (openModalsCount === 0) app.vent.trigger('overlay:hidden')
  })
</script>

<svelte:window on:keyup={onKeyUp} />
<button
  class="modal-overlay"
  on:click={close}
  use:autofocus={{ refocusOnVisibilityChange: false }}
  tabindex="-1"
>
  <!-- stopPropagation so that only clicks on overlay trigger a close -->
  <div
    class="modal-outer"
    class:size-auto={size === 'auto'}
    class:size-medium={size === 'medium'}
    class:size-large={size === 'large'}
    on:click|stopPropagation
    on:keydown|stopPropagation
    role="button"
    tabindex="-1"
  >
    <div class="modal-inner"><slot /></div>
    <button
      class="close"
      title={I18n('close')}
      on:click={close}
    >
      {@html icon('close')}
    </button>
  </div>
</button>

<style lang="scss">
  @import "#general/scss/utils";
  .modal-overlay{
    background: rgba(black, 0.55);
    overflow: auto;
    @include position(fixed, 0, 0, 0, 0);
    // Above the dropdown, .leaflet-pane, .leaflet-control, .leaflet-bottom
    z-index: 1001;
    @include display-flex(row, baseline, center);
    overflow-y: auto;
  }
  .modal-outer{
    max-width: 100vw;
    position: relative;
    background-color: white;
    @include radius;
  }
  .size-auto{
    flex: 0 1 auto;
  }
  .size-medium{
    flex: 0 1 40rem;
  }
  .close{
    position: absolute;
    inset-block-start: 0.2em;
    inset-inline-end: 0;
    margin: 0;
    padding: 0;
    font-size: 1.8rem;
    @include text-hover($grey, $dark-grey);
    background-color: transparent;
  }
  .modal-inner{
    :global(h2){
      text-align: center;
      font-size: 1.2rem;
      @include sans-serif;
    }
  }
  /* Large screens */
  @media screen and (width >= $small-screen){
    .modal-outer{
      margin: 1em 0;
      padding: 1em;
    }
    .modal-inner{
      min-width: 10em;
      margin: 1em;
    }
    .size-large{
      min-width: 60em;
    }
  }
  /* Small screens */
  @media screen and (width < $small-screen){
    .modal-outer{
      margin: 0.5em 0;
      padding: 0.5em;
    }
  }
</style>
