<script lang="ts">
  import Link from '#app/lib/components/link.svelte'
  import { imgSrc } from '#app/lib/handlebars_helpers/images'

  export let follower

  const { id, name, preferredUsername, icon } = follower
  function buildAddressLabel () {
    let addressLabel
    const hostname = id.split('/')[2]
    if (preferredUsername) {
      addressLabel = `${preferredUsername}@${hostname}`
    } else if (name) {
      addressLabel = `${name}@${hostname}`
    } else {
      addressLabel = id
    }
    return addressLabel
  }
</script>

<li>
  <a
    href={id}
    class="remote-user"
    target="_blank"
  >
    <span class="user-icon">
      {#if icon}
        <img src={imgSrc(icon.url)} alt="" loading="lazy" />
      {:else}
        <img alt="" />
      {/if}
    </span>
    <div class="info">
      {#if name}
        <div class="header">
          <span class="username">{name}</span>
        </div>
      {/if}
      <Link
        url={id}
        text={buildAddressLabel()}
      />
  </a>
</li>
<style lang="scss">
  @import "#general/scss/utils";
  li{
    @include bg-hover($light-grey, 5%);
    margin: 0.5em;
    padding: 0.5em;
  }
  .remote-user{
    @include display-flex(row, center, flex-start);
  }
  .user-icon{
    margin-inline-end: 0.5em;
    width: 3em;
    background-color: $image-placeholder-grey;
  }
  .info{
    position: relative;
    flex: 1;
  }
  .header{
    display: flex;
    flex-direction: row;
    width: 100%;
  }
  img{
    flex: 0 0 3em;
    height: 3rem;
    object-fit: cover;
  }
</style>
