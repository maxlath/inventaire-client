<!-- Inspired by https://imfeld.dev/writing/svelte_domless_components
     and https://github.com/ngyewch/svelte-leaflet -->
<script lang="ts">
  import L, { type Map } from 'leaflet'
  import { createEventDispatcher, setContext, tick } from 'svelte'
  import 'leaflet/dist/leaflet.css'
  import 'leaflet.markercluster/dist/MarkerCluster.css'
  import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
  // Needs to be initialized after window.L was set
  import 'leaflet.markercluster'
  // TODO: split markers style between components
  import '#map/scss/objects_markers.scss'
  import Flash from '#app/lib/components/flash.svelte'
  import { icon } from '#app/lib/icons'
  import isMobile from '#app/lib/mobile_check'
  import { onChange } from '#app/lib/svelte/svelte'
  import Spinner from '#general/components/spinner.svelte'
  import LocationSearchInput from '#map/components/location_search_input.svelte'
  import mapConfig from '#map/lib/config.ts'
  import { uniqBounds } from '#map/lib/map'
  import { getPositionFromNavigator } from '#map/lib/navigator_position'
  import { fitResultBbox } from '#map/lib/nominatim'
  import { i18n } from '#user/lib/i18n'

  mapConfig.init()

  // Must set either bounds, or view and zoom.
  export let bounds = null
  export let view = null
  export let zoom = 13
  export let cluster = false
  export let showLocationSearchInput = false
  export let showFindPositionFromGeolocation = false

  export let map: Map = null

  let clusterGroup, flash
  let destroyed = false
  let waitingForPosition

  const dispatch = createEventDispatcher()

  setContext('map', () => map)
  setContext('layer', () => clusterGroup || map)

  function findPositionFromGeolocation () {
    waitingForPosition = getPositionFromNavigator()
      .then(({ lat, lng }) => view = [ lat, lng ])
      .catch(err => flash = err)
  }

  async function initLeafletMap (node) {
    try {
      // Let the time to Svelte to setup surrounding elements,
      // so that Leaflet picks up the right map size
      await tick()
      if (destroyed) return
      map = L.map(node, mapConfig.mapOptions)
        .on('zoom', e => {
          dispatch('zoom', e)
          zoom = e.target._zoom
        })
        .on('move', e => dispatch('move', e))
        .on('moveend', e => dispatch('moveend', e))

      if (bounds) {
        // Prevent leaflet bug when the passed bounds are only identical bounds
        bounds = uniqBounds(bounds)
        if (bounds.length === 1) {
          const zoom = 9
          map.setView(bounds[0], zoom)
        } else {
          map.fitBounds(bounds, { padding: [ 20, 20 ] })
        }
      } else {
        map.setView(view, zoom)
      }

      L.tileLayer(mapConfig.tileUrl, mapConfig.tileLayerOptions)
        .addTo(map)

      if (isMobile) map.scrollWheelZoom.disable()

      if (cluster) {
        clusterGroup = L.markerClusterGroup({
          // Required to prevent big marker icons to overlap
          spiderfyDistanceMultiplier: 4,
        })
        map.addLayer(clusterGroup)
      }
    } catch (err) {
      flash = err
    }
  }

  // Svelte actions need to return sync, thus this sync wrapper
  // Similar issue https://github.com/sveltejs/language-tools/issues/2301
  function createLeaflet (node) {
    destroyed = false
    initLeafletMap(node)
    return {
      destroy () {
        if (map) {
          map.remove()
          map = null
        } else {
          destroyed = true
        }
      },
    }
  }

  function init () {
    try {
      if (map) {
        if (bounds) {
          map.fitBounds(bounds, { maxZoom: zoom })
        } else {
          map.setView(view, zoom)
        }
      }
    } catch (err) {
      flash = err
    }
  }

  function onBoundsChange () {
    if (map) map.fitBounds(bounds, { maxZoom: zoom })
  }

  function onViewChange () {
    if (map) map.setView(view, zoom)
  }

  $: onChange(map, init)
  $: if (bounds) onChange(bounds, onBoundsChange)
  $: if (view) onChange(view, onViewChange)
</script>

<div class="map-wrapper">
  <Flash state={flash} />

  <div class="location-search-input-wrapper">
    {#if map}
      {#if showLocationSearchInput}
        <LocationSearchInput on:selectLocation={e => fitResultBbox(map, e.detail)} />
      {/if}
      {#if showFindPositionFromGeolocation}
        <button on:click={findPositionFromGeolocation} class="tiny-button">
          {#await waitingForPosition}
            <Spinner />
          {:then}
            {@html icon('crosshairs')}
          {/await}
          {i18n('Geolocate')}
        </button>
      {/if}
    {/if}
  </div>
  <div class="map" use:createLeaflet>
    {#if map}
      <slot {map} />
    {/if}
  </div>
</div>

<style lang="scss">
  @import '#general/scss/utils';
  .map-wrapper{
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  .map{
    height: 100%;
    width: 100%;
  }
  :global(.leaflet-control-container){
    position: static;
  }
  :global(.leaflet-marker-icon){
    border: 0;
  }
  .location-search-input-wrapper{
    position: absolute;
    inset-block-start: 0.5em;
    inset-inline-end: 0.5em;
    z-index: 1000;
    width: min(20em, 80%);
    max-height: calc(100% - 4em);
    @include radius;
    @include display-flex(column);
  }
  .tiny-button{
    margin: 0.5em 0;
    line-height: 2em;
  }
</style>
