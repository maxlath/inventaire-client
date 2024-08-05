<script lang="ts">
  import app from '#app/app'
  import { autofocus } from '#app/lib/components/actions/autofocus'
  import { autosize } from '#app/lib/components/actions/autosize'
  import { userContent } from '#app/lib/handlebars_helpers/user_content'
  import { icon } from '#app/lib/icons'
  import { getActionKey } from '#app/lib/key_events'
  import { i18n, I18n } from '#user/lib/i18n'

  export let item, flash

  let { notes = '' } = item

  let editMode = false

  async function save () {
    editMode = false
    try {
      await app.request('items:update', {
        items: [ item ],
        attribute: 'notes',
        value: notes,
      })
      item.notes = notes
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

<div class="item-notes">
  {#if editMode}
    <div
      class="header"
      title={i18n('edit')}
    >
      <span class="section-label">{I18n('private notes')}</span>
      <span class="indicator" title={i18n('this is visible by anyone who can see this item')}>
        {@html icon('lock')}
      </span>
    </div>
    <textarea
      class="notes"
      placeholder={`(${i18n('notes_placeholder')})`}
      bind:value={notes}
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
      <span class="section-label">{I18n('private notes')}</span>
      <span>
        <span class="indicator" title={i18n('this is visible by anyone who can see this item')}>
          {@html icon('lock')}
        </span>
        <span>
          {@html icon('pencil')}
        </span>
      </span>
    </button>
    <div class="text">
      <button
        on:click={() => editMode = true}
        title={i18n('edit')}
      >
        <p>{@html userContent(notes)}</p>
      </button>
    </div>
  {/if}
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .item-notes{
    background-color: $dark-grey;
    padding: 0.5em 1em;
    margin: 0.4em 0 0.6em;
    @include radius;
    &, .text button, :global(.fa){
      color: white;
    }
  }
  .section-label{
    color: $soft-grey;
  }
  .text{
    button{
      display: block;
      padding: 0;
      p{
        text-align: start;
      }
    }
  }
  .tiny-button{
    line-height: inherit;
  }
  .header{
    @include display-flex(row, center, space-between);
    width: 100%;
  }
  .notes{
    margin-block-start: 0.5em;
  }
  .indicator{
    margin-inline-start: auto;
  }
</style>
