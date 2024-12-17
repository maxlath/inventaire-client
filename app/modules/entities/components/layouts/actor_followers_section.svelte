<script lang="ts">
  import ActorFollowers from '#activitypub/components/actor_followers.svelte'
  import { i18n } from '#user/lib/i18n'

  export let uri

  const actorName = uri.replace(':', '-')
</script>
<div class="actor-followers-section">
  <h4>{i18n('Fediverse followers')}</h4>
  <ActorFollowers {actorName} />
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .actor-followers-section{
    @include display-flex(column, center);
    padding: 0.5em 0;
    background-color: $off-white;
    margin-block-end: 2em ;
    :global(ul){
      max-block-size: 70vh;
      overflow-y: auto;
    }
    :global(li){
      @include bg-hover(white, 5%);
    }
  }
</style>
