<script lang="ts">
  import app from '#app/app'
  import Link from '#app/lib/components/link.svelte'
  import { icon as iconFn } from '#app/lib/handlebars_helpers/icons'
  import { getWikidataUrl, getWikidataHistoryUrl, type SerializedEntity } from '#entities/lib/entities'
  import { startRefreshTimeSpan } from '#entities/lib/entity_refresh'
  import Spinner from '#general/components/spinner.svelte'
  import { i18n, I18n } from '#user/lib/i18n'

  export let entity: SerializedEntity
  export let showEntityEditButtons = true

  let waitForEntityRefresh

  const { uri, wdUri, type, claims } = entity

  async function refreshEntity () {
    startRefreshTimeSpan(entity.uri)
    // Set refresh parameter to force router to navigate, despite the pathname being the same
    app.navigateAndLoad(`${entity.pathname}?refresh=true`)
  }

  const wikidataUrl = wdUri ? getWikidataUrl(wdUri) : null
  const wikidataHistoryUrl = wdUri ? getWikidataHistoryUrl(wdUri) : null
</script>

{#if showEntityEditButtons}
  <li>
    <Link
      url={`/entity/${uri}/edit`}
      text={i18n('Edit bibliographical info')}
      icon="pencil"
    />
  </li>
{/if}

{#if wikidataUrl}
  <li>
    <Link
      url={wikidataUrl}
      text={I18n('see_on_website', { website: 'wikidata.org' })}
      icon="wikidata"
    />
  </li>
  <li>
    <button
      on:click={refreshEntity}
      title={I18n('refresh Wikidata data')}
    >
      {#await waitForEntityRefresh}
        <Spinner />
      {:then}
        {@html iconFn('refresh')}
      {/await}
      <span class="button-text">{I18n('refresh Wikidata data')}</span>
    </button>
  </li>
  <li>
    <Link
      url={wikidataHistoryUrl}
      text={I18n('entity history')}
      icon="history"
    />
  </li>
{:else}
  {#if claims['wdt:P212'] && !wdUri}
    <li>
      <button
        on:click={refreshEntity}
        title={I18n('refresh external databases data')}
      >
        {#await waitForEntityRefresh}
          <Spinner />
        {:then}
          {@html iconFn('refresh')}
        {/await}
        <span class="button-text">{I18n('refresh external databases data')}</span>
      </button>
    </li>
  {/if}
  <li>
    <Link
      url={`/entity/${uri}/history`}
      text={I18n('entity history')}
      icon="history"
    />
  </li>
{/if}

{#if app.user.hasDataadminAccess && showEntityEditButtons}
  {#if type === 'human'}
    <li>
      <Link
        url={`/entity/${uri}/deduplicate`}
        text={i18n('Deduplicate sub-entities')}
        icon="compress"
      />
    </li>
  {/if}
  {#if type === 'serie'}
    <li>
      <Link
        url={`/entity/${uri}/cleanup`}
        text={I18n('cleanup entity')}
        icon="arrows"
      />
    </li>
  {/if}
{/if}
