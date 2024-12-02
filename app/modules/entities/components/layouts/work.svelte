<script lang="ts">
  import { setContext, tick } from 'svelte'
  import { writable } from 'svelte/store'
  import { property } from 'underscore'
  import app from '#app/app'
  import { isNonEmptyArray } from '#app/lib/boolean_tests'
  import Flash from '#app/lib/components/flash.svelte'
  import { scrollToElement } from '#app/lib/screen'
  import ActorFollowersSection from '#entities/components/layouts/actor_followers_section.svelte'
  import RelativeEntitiesList from '#entities/components/layouts/relative_entities_list.svelte'
  import { getRelativeEntitiesListLabel, getRelativeEntitiesProperties } from '#entities/components/lib/relative_entities_helpers.ts'
  import { getPublishersUrisFromEditions } from '#entities/components/lib/work_helpers'
  import { runEntityNavigate } from '#entities/lib/document_metadata'
  import { getEntitiesAttributesByUris, byPopularity, getAndAssignPopularity } from '#entities/lib/entities'
  import Spinner from '#general/components/spinner.svelte'
  import EntityListingsLayout from '#listings/components/entity_listings_layout.svelte'
  import { i18n } from '#user/lib/i18n'
  import { getSubEntities } from '../lib/entities.ts'
  import BaseLayout from './base_layout.svelte'
  import HomonymDeduplicates from './deduplicate_homonyms.svelte'
  import EditionsList from './editions_list.svelte'
  import EntityInfo from './entity_info.svelte'
  import ItemsLists from './items_lists.svelte'
  import WorkActions from './work_actions.svelte'

  export let entity

  let showMap, itemsListsWrapperEl, mapWrapperEl, flash

  const { uri, type } = entity
  let editionsUris
  let editions = []
  let initialEditions = []
  const userLang = app.user.lang
  let publishersByUris
  let allItems
  let itemsByEditions = {}
  let waitingForItems

  setContext('work-layout:filters-store', writable({}))

  const getEditionsWithPublishers = async () => {
    initialEditions = await getSubEntities('work', uri)
    const publishersUris = getPublishersUrisFromEditions(initialEditions)
    const { entities } = await getEntitiesAttributesByUris({
      uris: publishersUris,
      // info is necessary to get the type, and generate publisher URI link without "wdt:P921-" prefix
      attributes: [ 'info', 'labels' ],
      lang: userLang,
    })
    publishersByUris = entities
    await getAndAssignPopularity({ entities: initialEditions })
    editions = initialEditions.sort(byPopularity)
  }

  const waitingForEditions = getEditionsWithPublishers().catch(err => flash = err)

  async function showMapAndScrollToMap () {
    showMap = true
    await tick()
    scrollToElement(mapWrapperEl, { marginTop: 10, waitForRoomToScroll: false })
  }

  const scrollToItemsList = () => {
    scrollToElement(itemsListsWrapperEl, { marginTop: 10, waitForRoomToScroll: false })
  }

  $: runEntityNavigate(entity)
  $: if (isNonEmptyArray(editions)) {
    editionsUris = editions.map(property('uri'))
  }
  $: someEditions = editions && isNonEmptyArray(editions)
  $: hasSomeInitialEditions = initialEditions && isNonEmptyArray(initialEditions)
</script>

<BaseLayout bind:entity>
  <div class="entity-layout" slot="entity">
    <div class="top-section">
      <div class="work-section">
        <Flash state={flash} />
        <EntityInfo {entity} />
        <WorkActions
          {entity}
          {someEditions}
          {editions}
          bind:allItems
          on:showMapAndScrollToMap={showMapAndScrollToMap}
          on:scrollToItemsList={scrollToItemsList}
        />
      </div>
      <div
        class="editions-section-wrapper"
        class:no-edition={!hasSomeInitialEditions}
      >
        {#await waitingForEditions}
          <div class="loading-wrapper">
            <p class="loading">{i18n('Looking for editions…')}
              <Spinner />
            </p>
          </div>
        {:then}
          <EditionsList
            {hasSomeInitialEditions}
            {publishersByUris}
            parentEntity={entity}
            {initialEditions}
            bind:editions
            bind:itemsByEditions
            {waitingForItems}
          />
        {/await}
      </div>
    </div>
    {#await waitingForEditions then}
      {#if someEditions}
        <div class="items-lists-section">
          <ItemsLists
            {editionsUris}
            bind:showMap
            bind:allItems
            bind:itemsByEditions
            bind:waitingForItems
            bind:mapWrapperEl
            bind:itemsListsWrapperEl
            on:showMapAndScrollToMap={showMapAndScrollToMap}
          />
        </div>
      {/if}
    {/await}
    <EntityListingsLayout {entity} />
    <div class="relatives-lists">
      {#each getRelativeEntitiesProperties(type) as property}
        <RelativeEntitiesList
          {entity}
          {property}
          label={getRelativeEntitiesListLabel({ property, entity })}
        />
      {/each}
    </div>
    <ActorFollowersSection uri={entity.uri} />
    <HomonymDeduplicates {entity} />
  </div>
</BaseLayout>

<style lang="scss">
  @import "#general/scss/utils";
  @import "#entities/scss/relatives_lists";
  .entity-layout{
    @include display-flex(column, center);
    inline-size: 100%;
  }
  .no-edition{
    flex: none;
    inline-size: 15em;
  }
  .top-section{
    @include display-flex(row, flex-start, center);
    inline-size: 100%;
  }
  .work-section{
    @include display-flex(column, flex-start);
    flex: 1 0 0;
    margin: 0 1em;
    :global(.claims-infobox-wrapper){
      margin-block-end: 1em;
    }
    :global(.summary){
      margin-block-start: 0.5em;
    }
  }
  .items-lists-section{
    @include display-flex(column, center);
    inline-size: 100%;
    margin: 1em 0;
  }
  .loading-wrapper{
    @include display-flex(column, center);
  }
  .editions-section-wrapper{
    flex: 1;
    &.no-edition{
      flex: 0.4;
    }
  }
  .relatives-lists{
    margin-block-start: 1em;
    align-self: stretch;
    @include relatives-lists-commons;
  }
  /* Small screens */
  @media screen and (width < $small-screen){
    .work-section{
      margin-inline-start: 0;
      :global(.claims-infobox-wrapper){
        margin-block-end: 0;
      }
      :global(.summary.has-summary){
        margin-block-start: 1em;
      }
    }
    .top-section{
      @include display-flex(column, center);
    }
    .editions-section-wrapper{
      inline-size: 100%;
      margin-block-start: 1em;
    }
    .entity-layout{
      @include display-flex(column);
    }
  }
</style>
