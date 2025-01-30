<script lang="ts">
  import LandingPageFooter from '#welcome/components/landing_page_footer.svelte'
  import LandingScreen from '#welcome/components/landing_screen.svelte'
  import PublicMap from '#welcome/components/public_map.svelte'
  import SomePublicBooks from '#welcome/components/some_public_books.svelte'

  let items = []
</script>

<div class="welcome-layout">
  <LandingScreen />
  <PublicMap bind:items />
  <SomePublicBooks {items} />
  <LandingPageFooter />
  <div class="background-cover" />
</div>

<style lang="scss">
  @import "#general/scss/utils";
  .welcome-layout{
    :global(h3){
      margin-block-start: 0.5em;
      color: $dark-grey;
    }
  }
  .background-cover{
    @include position(fixed, 0, 0, 0, 0, -10);
    // Webpack will not be able to transform the asset path in development
    // as emitCss=false in Svelte dev config, so the image will only appear
    // when building for production.
    // Photo attribution in credits.hbs: Brittany Stevens
    @include multidef-bg-cover("brittanystevens.jpg", "hd");
  }
</style>
