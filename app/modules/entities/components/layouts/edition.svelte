<script lang="ts">
  import { tick } from 'svelte'
  import { scrollToElement } from '#app/lib/screen'
  import ActorFollowersSection from '#entities/components/layouts/actor_followers_section.svelte'
  import Summary from '#entities/components/layouts/summary.svelte'
  import WorksOtherEditions from '#entities/components/layouts/works_other_editions.svelte'
  import { runEntityNavigate } from '#entities/lib/document_metadata'
  import { addWorksClaims } from '#entities/lib/fetch_related_entities'
  import EntityImage from '../entity_image.svelte'
  import AuthorsInfo from './authors_info.svelte'
  import BaseLayout from './base_layout.svelte'
  import EditionActions from './edition_actions.svelte'
  import EntityTitle from './entity_title.svelte'
  import Infobox from './infobox.svelte'
  import ItemsLists from './items_lists.svelte'

  export let entity, works

  let showMap, itemsListsWrapperEl, mapWrapperEl

  const { uri, image } = entity
  let { claims } = entity

  async function showMapAndScrollToMap () {
    showMap = true
    await tick()
    scrollToElement(mapWrapperEl, { marginTop: 10, waitForRoomToScroll: false })
  }

  $: runEntityNavigate(entity)
  $: claims = addWorksClaims(claims, works)
</script>
<BaseLayout {entity}>
  <div class="entity-layout" slot="entity">
    <div class="top-section">
      {#if image.url}
        <EntityImage
          {entity}
          size={300}
          noImageCredits={true}
        />
      {/if}
      <div class="info-wrapper">
        <EntityTitle {entity} />
        <div class="infobox-wrapper">
          <div class="author-and-info">
            <AuthorsInfo {claims} />
            <Infobox
              {claims}
              omittedProperties={[ 'wdt:P1680' ]}
              entityType={entity.type}
            />
            <Summary {entity} />
          </div>
          <EditionActions {entity}
          />
        </div>
      </div>
    </div>
    <div class="items-lists-wrapper">
      <ItemsLists
        editionsUris={[ uri ]}
        bind:showMap
        bind:mapWrapperEl
        bind:itemsListsWrapperEl
        on:showMapAndScrollToMap={showMapAndScrollToMap}
      />
    </div>
    <div class="bottom-section">
      <WorksOtherEditions {works} {entity} />
    </div>
    <ActorFollowersSection uri={entity.uri} />
  </div>
</BaseLayout>

<style lang="scss">
  @import "#general/scss/utils";
  .entity-layout{
    inline-size: 100%;
  }
  .top-section{
    @include display-flex(row, flex-start, space-between);
    margin-block-end: 1em;
    :global(.entity-image){
      padding-inline-end: 1em;
      inline-size: 12em;
    }
  }
  .info-wrapper{
    flex: 1;
  }
  .infobox-wrapper{
    @include display-flex(row, center, space-between);
    :global(.summary){
      margin-block-start: 1em;
    }
  }
  .author-and-info{
    margin-inline-end: 1em;
  }
  .items-lists-wrapper{
    margin: 1em 0;
  }
  .bottom-section{
    @include display-flex(column, center);
  }

  /* Large screens */
  @media screen and (width >= $small-screen){
    .top-section{
      margin: 0 5em;
    }
  }
  /* Smaller screens */
  @media screen and (width < $smaller-screen){
    .info-wrapper{
      @include display-flex(column, center, center);
      margin-block-start: 1em;
    }
    .infobox-wrapper{
      @include display-flex(column, flex-start, center);
    }
    .top-section{
      @include display-flex(column, center);
    }
  }
  /* Very small screens */
  @media screen and (width < $very-small-screen){
    .author-and-info{
      margin-inline-end: 0;
    }
  }
</style>
