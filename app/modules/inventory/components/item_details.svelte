<script lang="ts">
  import app from '#app/app'
  import { autofocus } from '#app/lib/components/actions/autofocus'
  import { autosize } from '#app/lib/components/actions/autosize'
  import { userContent } from '#app/lib/handlebars_helpers/user_content'
  import { icon } from '#app/lib/icons'
  import { getActionKey } from '#app/lib/key_events'
  import { i18n, I18n } from '#user/lib/i18n'

  export let item, flash

  const { restricted, visibilitySummaryIconName } = item
  let { details = '' } = item

  let editMode = false

  async function save () {
    editMode = false
    try {
      await app.request('items:update', {
        items: [ item ],
        attribute: 'details',
        value: details,
      })
      item.details = details
    } catch (err) {
      flash = err
    }
  }

  function onKeyDown (e) {
    const key = getActionKey(e)
    if (key === 'esc') editMode = false
    else if (e.ctrlKey && key === 'enter') save()
    e.stopPropagation()
  }
</script>

<div class="item-details">
  {#if editMode}
    <div class="header">
      <span class="section-label">{I18n('details')}</span>
      {#if !restricted}
        <span class="indicator" title={i18n('this is visible by anyone who can see this item')}>
          {#if visibilitySummaryIconName}
            {@html icon(visibilitySummaryIconName)}
          {/if}
        </span>
      {/if}
    </div>
    <textarea
      class="details"
      placeholder={`(${i18n('details_placeholder')})`}
      bind:value={details}
      use:autofocus
      use:autosize
      on:keydown={onKeyDown}
    />
    <div class="button-group-right">
      <button
        class="tiny-button cancel"
        on:click={() => editMode = false}
      >
        {i18n('cancel')}
      </button>
      <button
        class="tiny-button success"
        on:click={save}
      >
        {i18n('save')}
      </button>
    </div>
  {:else}
    <button
      class="header"
      title={i18n('edit')}
      on:click={() => editMode = true}
    >
      <span class="section-label">{I18n('details')}</span>
      {#if !restricted}
        <span>
          <span class="indicator" title={i18n('this is visible by anyone who can see this item')}>
            {#if visibilitySummaryIconName}
              {@html icon(visibilitySummaryIconName)}
            {/if}
          </span>
          <button>
            {@html icon('pencil')}
          </button>
        </span>
      {/if}
    </button>

    <div class="text">
      {#if restricted}
        <p>{@html userContent(details)}</p>
      {:else}
        <button
          on:click={() => editMode = true}
          title={i18n('edit')}
        >
          <p>{@html userContent(details)}</p>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .item-details{
    background-color: $off-white;
    padding: 0.5em 1em;
    margin: 0.4em 0 0.6em;
    @include radius;
  }
  .text{
    button{
      text-align: start;
      display: block;
      padding: 0;
    }
  }
  .tiny-button{
    line-height: inherit;
  }
  .header{
    @include display-flex(row, center, space-between);
    width: 100%;
  }
  .details{
    margin-block-start: 0.5em;
  }
</style>
