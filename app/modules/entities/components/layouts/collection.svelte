<script lang="ts">
  import { setContext } from 'svelte'
  import { debounce } from 'underscore'
  import { onChange } from '#app/lib/svelte/svelte'
  import ActorFollowersSection from '#entities/components/layouts/actor_followers_section.svelte'
  import Summary from '#entities/components/layouts/summary.svelte'
  import WorksBrowser from '#entities/components/layouts/works_browser.svelte'
  import { getSubEntitiesSections } from '#entities/components/lib/entities'
  import { runEntityNavigate } from '#entities/lib/document_metadata'
  import Spinner from '#general/components/spinner.svelte'
  import BaseLayout from './base_layout.svelte'
  import HomonymDeduplicates from './deduplicate_homonyms.svelte'
  import EntityTitle from './entity_title.svelte'
  import Infobox from './infobox.svelte'

  export let entity

  const { uri } = entity
  runEntityNavigate(entity)

  setContext('layout-context', 'collection')
  setContext('search-filter-claim', `wdt:P195=${uri}`)
  // TODO: index editions
  // setContext('search-filter-types', null)

  let sections, waitingForSubEntities, flash
  function getSections () {
    waitingForSubEntities = getSubEntitiesSections({ entity })
      .then(res => sections = res)
      .catch(err => flash = err)
  }
  const lazyGetSections = debounce(getSections, 100)
  $: if (entity) onChange(entity, lazyGetSections)
</script>

<BaseLayout
  bind:entity
  bind:flash
>
  <div class="entity-layout" slot="entity">
    <div class="top-section">
      <div class="work-section">
        <EntityTitle {entity} />
        <Infobox
          claims={entity.claims}
          entityType={entity.type}
        />
        <Summary {entity} />
      </div>
      <div class="editions">
        {#await waitingForSubEntities}
          <Spinner center={true} />
        {:then}
          <WorksBrowser {sections} />
        {/await}
      </div>
    </div>
    <ActorFollowersSection uri={entity.uri} />
    <HomonymDeduplicates {entity} />
  </div>
</BaseLayout>

<style lang="scss">
  @import "#general/scss/utils";
  .entity-layout{
    align-self: stretch;
    @include display-flex(column, stretch);
    :global(.summary.has-summary){
      margin-block-start: 1em;
    }
  }
  .editions{
    margin-block-start: 1em;
  }
</style>
