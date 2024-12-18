<script lang="ts">
  import Link from '#app/lib/components/link.svelte'
  import Spinner from '#components/spinner.svelte'
  import { I18n } from '#user/lib/i18n'
  import UserInfobox from '#users/components/user_infobox.svelte'
  import { getUsersByIds } from '#users/users_data'

  export let task

  const { reporters: reportersIds, clue } = task

  let reporters
  const waitingForUsers = getUsersByIds(reportersIds)
    .then(res => reporters = Object.values(res))
</script>

{#await waitingForUsers}
  <Spinner center={true} />
{:then}
  <strong>{I18n('reporters')}</strong>
  <ul>
    {#each reporters as reporter}
      <li>
        <UserInfobox
          name={reporter.username}
          picture={reporter.picture}
          linkUrl={`/users/${reporter._id}/contributions`}
          linkTitle={I18n('contributions_by', reporter)}
        />
      </li>
    {/each}
  </ul>
{/await}

{#if clue}
  <li>
    <strong>{I18n('clue')}</strong>
    <Link
      url={`/entity/isbn:${clue}`}
      text={clue}
    />
  </li>
{/if}
