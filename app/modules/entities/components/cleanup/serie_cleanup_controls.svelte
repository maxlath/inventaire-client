<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { range } from 'underscore'
  import app from '#app/app'
  import Link from '#app/lib/components/link.svelte'
  import { icon } from '#app/lib/icons'
  import { loadInternalLink } from '#app/lib/utils'
  import { getWikipediaData } from '#app/lib/wikimedia/sitelinks'
  import Spinner from '#components/spinner.svelte'
  import type { SerializedEntity } from '#entities/lib/entities'
  import { i18n, I18n } from '#user/lib/i18n'
  import Checkbox from './checkbox.svelte'

  export let serie: SerializedEntity
  export let showAuthors = false
  export let showEditions = false
  export let showDescriptions = false
  export let largeMode = false
  export let placeholderCounter: number
  export let partsNumber: number
  export let maxOrdinal: number
  export let titlePattern: string
  export let worksWithOrdinalLength: number
  export let creatingPlaceholders: boolean

  let wikipedia
  if ('sitelinks' in serie) {
    wikipedia = getWikipediaData(serie.sitelinks, app.user.lang, serie.originalLang)
  }

  const dispatch = createEventDispatcher()
</script>

<div class="controls">
  <div class="controls-section">
    <div class="header">
      <h2><a href={serie.pathname} on:click={loadInternalLink}>{serie.label}</a></h2>

      <a
        href={serie.editPathname}
        class="pencil"
        title={i18n('edit data')}
        on:click={loadInternalLink}
      >
        {@html icon('pencil')}
      </a>

      {#if wikipedia}
        <span class="wikipedia">
          <Link url={wikipedia.url} title={i18n('Wikipedia')} icon="wikipedia-w" />
        </span>
      {/if}
    </div>

    <div class="checkboxes">
      <Checkbox bind:checked={showAuthors} label="show authors" />
      <Checkbox bind:checked={showEditions} label="show editions" />
      <Checkbox bind:checked={showDescriptions} label="show descriptions" />
      <Checkbox bind:checked={largeMode} label="large mode" />
    </div>
  </div>

  <div class="controls-section">
    <div class="control">
      <label>
        {i18n('number of parts')}
        <select class="parts-number" bind:value={partsNumber}>
          {#each range(maxOrdinal, worksWithOrdinalLength + 101) as num}
            <option value={num}>{num}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="control">
      <label>
        {i18n('title pattern')}
        <input class="title-pattern" name="pattern" value={titlePattern}>
      </label>
    </div>

    {#if placeholderCounter > 0}
      <button
        class="create-placeholders tiny-button light-blue"
        on:click={() => dispatch('createPlaceholders')}
        disabled={creatingPlaceholders}
      >
        {I18n('create all the missing parts')}
        <span class="counter">({placeholderCounter})</span>
        {#if creatingPlaceholders}
          <Spinner />
        {/if}
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  @import '#general/scss/utils';
  .controls-section{
    flex: 1 0 auto;
    background-color: $light-grey;
    h2, .pencil, .wikipedia{
      align-self: center;
    }
    .header, .control, .tiny-button{
      margin: 0 0.5em;
    }
    .header{
      @include display-flex(row, center, center, wrap);
    }
  }
  .pencil{
    @include shy;
  }
  h2{
    font-size: 1.2em;
    display: flex;
    margin: 1em;
    a{
      @include text-hover($dark-grey);
    }
  }
  .parts-number{
    max-width: 10em;
  }
  .title-pattern{
    margin: 0;
    max-width: 15em;
    @include radius;
    border: 0;
    text-align: center;
  }
  .create-placeholders{
    margin-block-start: 1.3em;
  }
  .control{
    padding: 0.5em;
    text-align: center;
    @include display-flex(column, baseline, center);
    label{
      text-align: center;
      white-space: nowrap;
      margin-block-end: 0;
      align-self: stretch;
    }
  }
  .checkboxes{
    @include display-flex(row, center, flex-start, wrap);
  }

  /* Small screens */
  @media screen and (width < $small-screen){
    .controls-section{
      @include display-flex(row, center, center, wrap);
    }
  }

  /* Large screens */
  @media screen and (width >= $small-screen){
    .controls{
      @include display-flex(row, null, null, wrap);
    }
    .controls-section{
      @include display-flex(row, center, flex-start);
      &:nth-child(2){
        justify-content: flex-end;
      }
    }
    .checkboxes{
      margin-inline-start: auto;
    }
  }
</style>
