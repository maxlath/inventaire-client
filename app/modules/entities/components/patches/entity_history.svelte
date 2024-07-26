<script lang="ts">
  import Flash from '#app/lib/components/flash.svelte'
  import Link from '#app/lib/components/link.svelte'
  import { loadInternalLink } from '#app/lib/utils'
  import { getWdHistoryUrl, unprefixify } from '#app/lib/wikimedia/wikidata'
  import FullScreenLoader from '#components/full_screen_loader.svelte'
  import Spinner from '#components/spinner.svelte'
  import Patch from '#entities/components/patches/patch.svelte'
  import { getEntityByUri } from '#entities/lib/entities'
  import { getEntityPatches } from '#entities/lib/patches'
  import type { EntityUri } from '#server/types/entity'
  import { i18n, I18n } from '#user/lib/i18n'

  export let uri: EntityUri

  let pathname, label, flash, patches, wdId

  const waitForEntity = getEntityByUri({ uri })
    .then(entity => {
      pathname = entity.pathname
      label = entity.label
      const wdUri = entity.claims['invp:P1']?.[0]
      if (wdUri) wdId = unprefixify(wdUri)
    })
    .catch(err => flash = err)

  async function fetchPatches () {
    patches = await getEntityPatches(uri)
  }

  const waitingForPatches = fetchPatches()
    .catch(err => flash = err)
</script>

<Flash state={flash} />

{#await waitForEntity}
  <FullScreenLoader />
{:then}
  <div class="entity-history">
    <div class="header">
      <h2>
        <a class="link" href={pathname} on:click={loadInternalLink}>
          {label}
        </a>
        - {I18n('history')}
      </h2>
      <span class="uri">{uri}</span>
      {#if wdId}
        <div class="see-on-wikidata">
          <p>{i18n('Only the entity history for claims stored directly in Inventaire database can be found here. For the rest:')}</p>
          <p class="see-on-wikidata">
            <Link
              url={getWdHistoryUrl(wdId)}
              text={I18n('See entity history on Wikidata')}
              icon="wikidata"
              tinyButton={true}
            />
          </p>
        </div>
      {/if}
    </div>

    {#await waitingForPatches}
      <Spinner center={true} />
    {:then}
      {#if patches}
        <ul>
          {#each patches as patch}
            <Patch {patch} />
          {/each}
        </ul>
      {/if}
    {/await}
  </div>
{/await}

<style lang="scss">
  @import "#general/scss/utils";

  .entity-history{
    color: white;
    max-width: 50em;
    margin: 0 auto;
  }
  .header{
    margin: 0.5em;
  }
  .uri{
    font-size: 1rem;
  }
  .see-on-wikidata{
    @include display-flex(column, center, center);
    padding: 0.5em;
    margin: 0.5em 0;
    color: $default-text-color;
    background-color: #ccc;
    @include radius;
    :global(a){
      @include bg-hover($wikidata-green);
    }
    :global(.fa-wikidata){
      margin-inline-end: 0.5rem;
    }
  }
</style>
