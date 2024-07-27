<script lang="ts">
  import { API } from '#app/api/api'
  import app from '#app/app'
  import Flash from '#app/lib/components/flash.svelte'
  import Link from '#app/lib/components/link.svelte'
  import { icon } from '#app/lib/icons'
  import preq from '#app/lib/preq'
  import Dropdown from '#components/dropdown.svelte'
  import Spinner from '#components/spinner.svelte'
  import { getWikidataUrl } from '#entities/lib/entities'
  import { checkWikidataMoveabilityStatus, moveToWikidata } from '#entities/lib/move_to_wikidata'
  import { i18n, I18n } from '#user/lib/i18n'

  export let entity

  let flash
  const { uri, invUri, label, history } = entity
  const { hasDataadminAccess } = app.user
  const wikidataUrl = getWikidataUrl(uri)
  const { ok: canBeMovedToWikidata, reason: moveabilityStatus } = checkWikidataMoveabilityStatus(entity)
  const canBeDeleted = invUri != null
  let waitForWikidataMove

  async function _moveToWikidata () {
    try {
      if (!app.user.hasWikidataOauthTokens()) {
        return app.execute('show:wikidata:edit:intro:modal', uri)
      }
      waitForWikidataMove = moveToWikidata(uri)
      await waitForWikidataMove
      // This should now redirect us to the new Wikidata edit page
      app.execute('show:entity:edit', uri)
    } catch (err) {
      flash = err
      throw err
    }
  }

  function reportDataError (e) {
    app.execute('show:feedback:menu', {
      subject: `[${uri}][${I18n('data error')}] `,
      uris: [ uri ],
      event: e,
    })
  }

  function loadSettings () {
    app.execute('show:settings:display')
  }

  function deleteEntity () {
    app.execute('ask:confirmation', {
      confirmationText: I18n('delete_entity_confirmation', { label }),
      action: _deleteEntity,
    })
  }

  async function _deleteEntity () {
    try {
      await preq.post(API.entities.delete, { uris: [ invUri ] })
      app.execute('show:entity:edit', uri)
    } catch (err) {
      // TODO: recover displayDeteEntityErrorContext feature to show rich error message
      flash = err
      throw err
    }
  }
</script>

<div class="menu-wrapper">
  <Dropdown buttonTitle={i18n('Show actions')} dropdownWidthBaseInEm={14}>
    <div slot="button-inner">
      {@html icon('cog')}
    </div>
    <ul slot="dropdown-content">
      {#if wikidataUrl}
        <li>
          <Link
            url={wikidataUrl}
            text={I18n('see_on_website', { website: 'wikidata.org' })}
            icon="wikidata"
          />
        </li>
      {/if}
      <li>
        <Link
          url={history}
          text={I18n('entity history')}
          icon="history"
        />
      </li>
      {#if hasDataadminAccess}
        <li>
          <Link
            url="/entity/merge?from={uri}"
            text={I18n('merge')}
            icon="compress"
          />
        </li>
        {#if canBeDeleted}
          <li>
            <button
              title={I18n('delete entity')}
              on:click={deleteEntity}
            >
              {@html icon('trash')}
              {I18n('delete')}
            </button>
          </li>
        {/if}
      {/if}
      <li>
        <button
          disabled={!canBeMovedToWikidata}
          title={moveabilityStatus}
          on:click={_moveToWikidata}
        >
          {#await waitForWikidataMove}
            <Spinner />
          {:then}
            {@html icon('wikidata')}
          {/await}
          {I18n('move to Wikidata')}
        </button>
      </li>
      <li>
        <button
          title={I18n('report_an_error_in_entity_data')}
          on:click={reportDataError}
        >
          {@html icon('flag')}
          {I18n('report an error')}
        </button>
      </li>
      <li>
        <button
          class="show-props-menu"
          on:click={loadSettings}
        >
          {@html icon('wrench')}
          {I18n('customize editable properties')}
        </button>
      </li>
      {#if flash}
        <li>
          <Flash bind:state={flash} />
        </li>
      {/if}
    </ul>
  </Dropdown>
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .menu-wrapper{
    $entity-edit-max-width: 40em;
    /* Small screens */
    @media screen and (width < $entity-edit-max-width){
      margin-inline-end: 0.5em;
      padding: 0.5em;
    }
    /* Large screens */
    @media screen and (width >= $entity-edit-max-width){
      position: absolute;
      inset-inline-end: 0;
      inset-block-start: 1.4em;
    }
    :global(.dropdown-button){
      @include big-button($grey);
      padding: 0.8rem;
    }
    :global(.small-spinner){
      // Aligning with other icons
      margin-inline: -4px 3px;
    }
  }
  [slot="button-inner"]{
    :global(.fa){
      font-size: 1.2rem;
    }
  }
  [slot="dropdown-content"]{
    @include shy-border;
    background-color: white;
    @include radius;
    button, :global(a){
      font-weight: normal;
      flex: 1;
      @include display-flex(row, center, flex-start);
      text-align: start;
      @include bg-hover(white, 5%);
      padding: 0.5em;
      :global(.fa){
        margin-inline-end: 0.5em;
      }
    }
  }
  li{
    @include display-flex(row, stretch);
    min-block-size: 3em;
    &:not(:last-child){
      margin-block-end: 0.2em;
    }
    :global(.error){
      flex: 1;
    }
  }
  button:disabled{
    @include shy(0.9);
  }
</style>
