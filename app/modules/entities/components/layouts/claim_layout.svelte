<script context="module" lang="ts">
  const defaultTypeByClaimProperty = {
    'wdt:P135': 'movement',
    'wdt:P136': 'genre',
    'wdt:P7937': 'form',
  } as const
</script>
<script lang="ts">
  import { setContext } from 'svelte'
  import { debounce } from 'underscore'
  import { isNonEmptyPlainObject } from '#app/lib/boolean_tests'
  import { onChange } from '#app/lib/svelte/svelte'
  import { loadInternalLink } from '#app/lib/utils'
  import ActorFollowersSection from '#entities/components/layouts/actor_followers_section.svelte'
  import Summary from '#entities/components/layouts/summary.svelte'
  import WorksBrowser from '#entities/components/layouts/works_browser.svelte'
  import { getSubentitiesTypes } from '#entities/components/lib/claim_layout_helpers'
  import { getSubEntitiesSections } from '#entities/components/lib/entities'
  import { getRelativeEntitiesListLabel, getRelativeEntitiesProperties } from '#entities/components/lib/relative_entities_helpers.ts'
  import { runEntityNavigate } from '#entities/lib/document_metadata'
  import type { SerializedEntity } from '#entities/lib/entities'
  import { isStandaloneEntityType } from '#entities/lib/types/entities_types'
  import Spinner from '#general/components/spinner.svelte'
  import type { PropertyUri } from '#server/types/entity'
  import EntityImage from '../entity_image.svelte'
  import BaseLayout from './base_layout.svelte'
  import RelativeEntitiesList from './relative_entities_list.svelte'

  export let entity: SerializedEntity
  export let property: PropertyUri

  const { uri } = entity
  // Infer a type from a property
  entity.type ??= defaultTypeByClaimProperty[property]
  const { label, type } = entity

  runEntityNavigate(entity, { uriPrefix: `${property}-` })

  setContext('layout-context', type)
  setContext('search-filter-claim', `${property}=${uri}`)

  const searchTypes = getSubentitiesTypes(property)
  if (searchTypes.length > 0) setContext('search-filter-types', searchTypes)

  const typeLabel = defaultTypeByClaimProperty[property] || 'subject'

  let sections, waitingForReverseEntities, flash
  function getSections () {
    waitingForReverseEntities = getSubEntitiesSections({ entity, property })
      .then(res => sections = res)
      .catch(err => flash = err)
  }
  const lazyGetSections = debounce(getSections, 100)
  $: if (entity) onChange(entity, lazyGetSections)
</script>

<BaseLayout
  bind:entity
  bind:flash
  {typeLabel}
  showEntityEditButtons={false}
>
  <div class="entity-layout" slot="entity">
    <div class="title-row">
      <a
        href={`/entity/${uri}`}
        on:click={loadInternalLink}
      >
        <h2>
          {label}
        </h2>
      </a>
    </div>
    <div class="top-section">
      {#if !isStandaloneEntityType(type)}
        {#if isNonEmptyPlainObject(entity.image)}
          <EntityImage
            {entity}
            size={192}
          />
        {/if}
        <Summary {entity} />
      {/if}
    </div>
    <div class="relatives-browser">
      {#await waitingForReverseEntities}
        <Spinner center={true} />
      {:then}
        <WorksBrowser {sections} />
      {/await}
    </div>
    <div class="relatives-lists">
      {#each getRelativeEntitiesProperties(type, property) as relativeProperty}
        <RelativeEntitiesList
          {entity}
          property={relativeProperty}
          label={getRelativeEntitiesListLabel({ property, entity })}
        />
      {/each}
    </div>
    <ActorFollowersSection uri={entity.uri} />
  </div>
</BaseLayout>

<style lang="scss">
  @import "#general/scss/utils";
  .entity-layout{
    align-self: stretch;
    @include display-flex(column, stretch);
  }
  a:hover{
    text-decoration: underline;
  }
  .top-section{
    @include display-flex(row, center);
    :global(.entity-image){
      flex: 1 0 auto;
      margin-inline-end: 1em;
    }
  }
  .title-row{
    @include display-flex(row, center);
  }
  .relatives-browser{
    margin-block-start: 1em;
  }
  /* Smaller screens */
  @media screen and (width < $smaller-screen){
    .top-section{
      display: block;
      :global(.entity-image){
        margin-block-end: 1em;
      }
    }
  }
</style>
