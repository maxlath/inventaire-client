<script lang="ts">
  import ActorFollower from '#activitypub/components/actor_follower.svelte'
  import { API } from '#app/api/api'
  import Flash from '#app/lib/components/flash.svelte'
  import preq from '#app/lib/preq'
  import InfiniteScroll from '#components/infinite_scroll.svelte'
  import { i18n } from '#user/lib/i18n'

  export let actorName, standalone = false
  let flash, fetching
  let hasMore = true
  let remoteFollowers = []
  const limit = 10
  let offset = 0

  async function fetchMore () {
    try {
      fetching = true
      const { orderedItems: remoteFollowersBatch } = await preq.get(API.activitypub.followers({
        limit,
        offset,
        name: actorName,
        'with-actors-info': true,
      }))
      const newUsers = remoteFollowersBatch.filter(newUser => !remoteFollowers.includes(newUser))
      if (newUsers.length === 0) hasMore = false
      remoteFollowers = [ ...remoteFollowers, ...newUsers ]
      fetching = false
      offset += limit
    } catch (err) {
      flash = err
    }
  }
  async function keepScrolling () {
    if (fetching || hasMore === false) return false
    fetching = true
    try {
      await fetchMore()
      return true
    } catch (err) {
      flash = err
      return false
    } finally {
      fetching = false
    }
  }
</script>

{#if standalone}
  <h2>{i18n('followers_of', { actorName })}</h2>
{/if}

<Flash state={flash} />

<InfiniteScroll {keepScrolling} showSpinner={true}>
  <ul>
    {#each remoteFollowers as follower (follower.id)}
      <ActorFollower {follower} />
    {/each}
  </ul>
</InfiniteScroll>

<style lang="scss">
  @import "#general/scss/utils";
  h2{
    @include display-flex(column, stretch, center);
    margin: 0.5em 0;
    text-align: center;
  }
  ul{
    max-width: 50em;
    margin: auto;
  }
</style>
