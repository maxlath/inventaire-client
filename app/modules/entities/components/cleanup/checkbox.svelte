<script lang="ts">
  import { I18n } from '#user/lib/i18n'

  export let label: string
  export let checked = false
</script>

<div class="checkbox-wrapper">
  <label class="checkbox-label">
    <input
      class="checkbox-input"
      type="checkbox"
      bind:checked
    />
    {I18n(label)}
  </label>
</div>

<style lang="scss">
  @import '#general/scss/utils';
  .checkbox-wrapper{
    margin: 0.5em;
    @include display-flex(row, center, center);
  }
  .checkbox-input{
    height: 1em;
    margin: 0 0.5em;
  }
  .checkbox-label{
    padding: 0;
    margin: 0;
    text-align: start;
  }
  label{
    text-align: center;
    white-space: nowrap;
    margin-block-end: 0;
    align-self: stretch;
  }
</style>
