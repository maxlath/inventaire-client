<script>
  import { imgSrc } from '#app/lib/handlebars_helpers/images'
  import { loadInternalLink } from '#app/lib/utils'

  export let name, label, picture, linkUrl, linkTitle = ''
</script>

<div class="user-infobox">
  {#if label}
    <span class="label">{label}</span>
  {/if}
  <a
    href={linkUrl}
    title={linkTitle}
    on:click={loadInternalLink}
  >
    {#if picture}
      <img src={imgSrc(picture, 32)} alt="" loading="lazy" />
    {/if}
    <span class="username">{name}</span>
  </a>
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .label{
    color: $label-grey;
    display: block;
  }
  .user-infobox{
    a{
      display: block;
      padding: 0.5em 0.5em 0.5em 0;
      @include radius;
      @include bg-hover($light-grey);
      img{
        height: 32px;
      }
    }
  }
  .username{
    font-weight: bold;
    @include sans-serif;
    margin-inline-start: 0.2em;
  }
</style>
