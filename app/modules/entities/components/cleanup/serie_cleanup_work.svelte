<script lang="ts">
  import { icon } from '#app/lib/icons'
  import type { SerializedEntity } from '#entities/lib/entities'
  import type { SeriePartPlaceholder } from '#entities/views/cleanup/lib/fill_gaps'
  import { i18n, I18n } from '#user/lib/i18n'

  export let work: SerializedEntity | SeriePartPlaceholder
  export let possibleOrdinals: number[]
  export let showAuthors: boolean
  export let showEditions: boolean
  export let showDescriptions: boolean
  export let largeMode: boolean

  const { label, serieOrdinalNum } = work
  let description, pathname, editPathname
  let isPlaceholder = false
  if ('isPlaceholder' in work) {
    ;({ isPlaceholder } = work)
  } else {
    ;({ description, pathname, editPathname } = work)
  }
</script>

<li class="serie-cleanup-work" class:placeholder={isPlaceholder} class:large={largeMode}>
  <div class="head">
    {#if serieOrdinalNum}
      <span class="serieOrdinalNum">{serieOrdinalNum}</span>
    {:else}
      <select class="ordinalSelector glowing">
        <option value="">--</option>
        {#each possibleOrdinals as num}
          <option value={num}>{num}</option>
        {/each}
      </select>
    {/if}
    {#if isPlaceholder}
      <span class="label">{label}</span>
      <span class="creation-call">{i18n('create')}</span>
    {:else}
      <a class="showEntity link" href={pathname}>
        <span class="label">{label}</span>
        {#if showDescriptions && description}
          <span class="description">{description}</span>
        {/if}
      </a>
      <a
        href={editPathname}
        class="showEntityEdit pencil"
        title={i18n('edit data')}
      >
        {@html icon('pencil')}
      </a>
      <button class="toggle-merge-work-picker" title={i18n('merge')}>
        {@html icon('compress')}
      </button>
    {/if}
  </div>
  <div class="mergeWorkPicker"></div>
  {#if showAuthors}
    <div class="authors-container"></div>
  {/if}
  {#if showEditions}
    <div class="editions-container"></div>
  {/if}
  {#if isPlaceholder}
    <div class="placeholderEditor hidden enterClickWrapper">
      <div class="placeholder-label-editor">
        <!-- {PARTIAL 'entities:editor:language_selector' langs} -->
        <input type="text" class="placeholderLabel enterClick" value={label}>
      </div>
      <button class="create tiny-success-button enterClickTarget">{I18n('create')}</button>
    </div>
  {/if}
</li>

<style lang="scss">
  @import '#general/scss/utils';
  .serie-cleanup-work{
    margin: 0.5em;
    padding: 0.5em;
    width: 22em;
    background-color: $light-grey;
    @include radius;
    .head{
      @include display-flex(row, center);
    }
    &.placeholder{
      @include bg-hover(#bbb);
      cursor: pointer;
      .pencil{
        display: none;
      }
    }
    .ordinalSelector{
      max-width: 4em;
      margin-inline-end: 0.5em;
    }
    .ordinal{
      font-size: 1.2em;
      color: $grey;
      font-weight: bold;
      @include serif;
      padding-inline-end: 1em;
    }
    .showEntity{
      .label, .description{
        display: block;
        line-height: 1.3em;
      }
      .description{
        color: $grey;
      }
    }
    .showEntityEdit{
      margin-inline-start: auto;
    }
    .workPicker{
      margin: 1em 0 0.5em;
      .validate:not(.hidden){
        display: block;
      }
    }
    .creation-call{
      background-color: #666;
      color: white;
      @include radius;
      padding: 0 0.4em;
      margin-inline-start: auto;
      min-width: 5em;
      text-align: center;
    }
    .authors-container, .editions-container{
      max-height: 20em;
      overflow: auto;
    }
    .authors-container, .editions-container ul:not(:empty){
      margin: 1em 0;
    }
    .placeholder-label-editor{
      @include display-flex(row, baseline, center);
      margin-block-end: 0.5em;
      select{
        width: 6em;
        padding: 0.1em;
      }
      input{
        margin: 0;
      }
    }
  }
  .toggle-merge-work-picker{
    @include shy;
  }

  .serie-cleanup-author{
    padding: 0.5em;
    @include radius;
    margin: 0.2em 0;
    &:not(.suggestion){
      background-color: white;
    }
    &.suggestion{
      @include bg-hover(#bbb);
      cursor: pointer;
    }
  }

  .large{
    width: 25em;
    .authors-container, .editions-container{
      max-height: 60em;
    }
  }

</style>
