<script lang="ts">
  import { userContent } from '#app/lib/handlebars_helpers/user_content'
  import { icon } from '#app/lib/icons'
  import { onChange } from '#app/lib/svelte/svelte'
  import type { SerializedUser } from '#app/modules/users/lib/users'
  import Dropdown from '#components/dropdown.svelte'
  import Modal from '#components/modal.svelte'
  import { getVisibilitySummary, getVisibilitySummaryLabel, visibilitySummariesData } from '#general/lib/visibility'
  import ListingEditor from '#listings/components/listing_editor.svelte'
  import { i18nTypesKeys } from '#listings/lib/entities_typing'
  import type { Listing } from '#server/types/listing'
  import { i18n } from '#user/lib/i18n'
  import UserInfobox from '#users/components/user_infobox.svelte'

  export let listing: Listing
  export let isEditable: boolean
  export let creator: SerializedUser

  let { name, type = 'work', description, visibility } = listing

  let visibilitySummary, visibilitySummaryIcon, visibilitySummaryLabel, showListEditorModal

  const { username, picture, listingsPathname: userListingsPathname } = creator

  const i18nTypeKey = i18nTypesKeys[type]

  const updateVisibilitySummary = () => {
    visibility = listing.visibility
    visibilitySummary = getVisibilitySummary(visibility)
    visibilitySummaryIcon = visibilitySummariesData[visibilitySummary].icon
    visibilitySummaryLabel = i18n(getVisibilitySummaryLabel(visibility))
  }

  $: name = listing.name
  $: description = listing.description
  $: onChange(listing, updateVisibilitySummary)
</script>

<div class="listing-info">
  <div class="header">
    <div class="first-row">
      <h2>{name}</h2>
      {#if isEditable}
        <Dropdown
          align="right"
          buttonTitle={i18n('Show actions')}
          clickOnContentShouldCloseDropdown={true}
          dropdownWidthBaseInEm={20}
        >
          <div slot="button-inner">
            {@html icon('cog')}
          </div>
          <ul slot="dropdown-content">
            <li>
              <button on:click={() => showListEditorModal = true}
              >
                {@html icon('pencil')}
                {i18n('Edit list info')}
              </button>
            </li>
          </ul>
        </Dropdown>
      {/if}
    </div>
    {#if description}
      <p>{@html userContent(description)}</p>
    {/if}
  </div>
  <div class="creator-row">
    <UserInfobox
      linkUrl={userListingsPathname}
      linkTitle={i18n('see_all_listings_by_user', { username })}
      label={i18n('List creator')}
      name={username}
      {picture}
    />
    <div class="right-section">
      <div class="listing-type">
        <span class="label">{i18n('Type')}</span>
        <span class="visibility-indicator">
          {i18n(i18nTypeKey)}
        </span>
      </div>
      <div class="visibility">
        <span class="label">{i18n('Visible by')}</span>
        <span class="visibility-indicator">
          {@html icon(visibilitySummaryIcon)} {visibilitySummaryLabel}
        </span>
      </div>
    </div>
  </div>
</div>

{#if showListEditorModal}
  <Modal on:closeModal={() => showListEditorModal = false}
  >
    <ListingEditor
      bind:listing
      on:listingEditorDone={() => showListEditorModal = false}
    />
  </Modal>
{/if}

<style lang="scss">
  @import "#general/scss/utils";
  .listing-info{
    align-self: stretch;
    margin: 0.5em;
    margin-block-end: 1em;
    padding: 0.5em 1em 1em;
    @include radius;
    background-color: $light-grey;
  }
  h2{
    margin-block-start: 0;
    font-weight: bold;
  }
  .first-row{
    @include display-flex(row, center, space-between);
    width: 100%;
  }
  .header{
    @include display-flex(column, baseline);
  }
  .creator-row{
    margin-block-start: 1em;
    @include display-flex(row, center, space-between);
  }
  .label{
    color: $label-grey;
    display: block;
  }
  [slot="button-inner"]{
    @include tiny-button($grey);
    padding: 0.5em;
  }
  [slot="dropdown-content"]{
    min-width: min(10em, 100vw);
    @include shy-border;
    background-color: white;
    @include radius;
    position: relative;
    :global(li){
      @include display-flex(row, stretch, flex-start);
      &:not(:last-child){
        margin-block-end: 0.2em;
      }
    }
    :global(button){
      flex: 1;
      @include display-flex(row, center, flex-start);
      min-block-size: 3em;
      @include bg-hover(white, 10%);
      padding: 0 1em;
      text-align: start;
    }
    :global(.fa){
      margin-inline-end: 0.5rem;
    }
  }
  .right-section{
    text-align: center;
  }
  .listing-type{
    padding-block-end: 0.5em;
  }
  .visibility{
    padding: 0.2em;
    @include radius;
  }
  /* Small screens */
  @media screen and (width < $small-screen){
    .listing-info{
      padding: 1em;
      margin: 0;
    }
    [slot="button-inner"]{
      padding: 0.3em;
    }
  }
  /* Smaller screens */
  @media screen and (width < $smaller-screen){
    .first-row{
      @include display-flex(column-reverse);
    }
  }
</style>
