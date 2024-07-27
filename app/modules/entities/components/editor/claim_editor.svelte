<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { API } from '#app/api/api'
  import app from '#app/app'
  import { isComponentEvent } from '#app/lib/boolean_tests'
  import Flash from '#app/lib/components/flash.svelte'
  import { newError } from '#app/lib/error'
  import { icon } from '#app/lib/icons'
  import { getActionKey } from '#app/lib/key_events'
  import preq from '#app/lib/preq'
  import Spinner from '#components/spinner.svelte'
  import { editors } from '#entities/components/editor/lib/editors'
  import { currentEditorKey, errorMessageFormatter, isNonEmptyClaimValue } from '#entities/components/editor/lib/editors_helpers'
  import SelectAuthorRole from '#entities/components/editor/select_author_role.svelte'
  import { propertiesEditorsConfigs } from '#entities/lib/properties'
  import { I18n, i18n } from '#user/lib/i18n'
  import DisplayModeButtons from './display_mode_buttons.svelte'
  import EditModeButtons from './edit_mode_buttons.svelte'

  export let entity, property, value, index

  const dispatch = createEventDispatcher()
  const { uri, type } = entity
  const creationMode = uri == null
  const { datatype, canValueBeDeleted, specialEditActions } = propertiesEditorsConfigs[property]
  const { InputComponent, DisplayComponent, showSave } = editors[datatype]
  const fixed = datatype.split('-')[0] === 'fixed'

  let inputValue = value
  let savedValue = value
  let editMode = (inputValue == null)

  let getInputValue, flash, valueLabel, previousValue, previousValueLabel

  function showEditMode () {
    if (inputValue === Symbol.for('removed')) inputValue = null
    editMode = true
    flash = null
  }

  function closeEditMode () {
    editMode = false
    flash = null
    // Updates the parent array, mostly to remove a null value
    dispatch('set', inputValue)
  }

  const editorKey = `${uri || type}:${property}:${index}`
  const setCurrentEditorKey = () => $currentEditorKey = editorKey
  $: if (editMode) setCurrentEditorKey()
  $: if (editorKey !== $currentEditorKey) closeEditMode()

  let saving = false
  async function save (newValue?) {
    try {
      saving = true
      // Allow null to be passed when trying to remove a value
      // but ignore the argument when dispatch('save') is called without argument.
      // This can only be done in components that export a getInputValue function
      if ((newValue === undefined || isComponentEvent(newValue)) && typeof getInputValue === 'function') {
        newValue = await getInputValue()
      }
      if (newValue === undefined) throw newError('missing new value', 500, { uri, property })
      inputValue = newValue
      editMode = false
      dispatch('set', inputValue)
      if (savedValue === inputValue) return
      if (!creationMode) {
        app.execute('invalidate:entities:cache', uri)
        await preq.put(API.entities.claims.update, {
          uri,
          property,
          'old-value': savedValue,
          'new-value': typeof newValue === 'symbol' ? null : newValue,
        })
      }
      previousValue = savedValue
      previousValueLabel = valueLabel
      savedValue = inputValue
      flash = null
    } catch (err) {
      // Revert change, unless that would mean removing this component
      // thus hiding the error
      if (savedValue === null) {
        editMode = true
      } else {
        inputValue = savedValue
        dispatch('set', inputValue)
      }
      flash = errorMessageFormatter(err)
    } finally {
      saving = false
    }
  }

  const remove = () => {
    if (inputValue === null) {
      save(null)
    } else {
      save(Symbol.for('removed'))
    }
  }

  function onInputKeyup (componentEvent) {
    const domEvent = componentEvent.detail
    const key = getActionKey(domEvent)
    if (key === 'esc') closeEditMode()
    else if (domEvent.ctrlKey && key === 'enter') save()
  }

  function showError (componentEvent) {
    flash = componentEvent.detail
    editMode = false
  }

  function undo () {
    if (!isNonEmptyClaimValue(previousValue)) {
      throw newError('can not undo without previous value', 500, { uri, property, value, previousValue })
    }
    save(previousValue)
  }

  function onMoved () {
    entity.claims[property][index] = inputValue = Symbol.for('moved')
  }

  let undoTitle
  $: {
    if (inputValue === Symbol.for('removed') && isNonEmptyClaimValue(previousValue)) {
      undoTitle = `${i18n('Recover previous value:')} ${previousValueLabel}`
      if (previousValue !== previousValueLabel) undoTitle += ` (${previousValue})`
    } else if (inputValue === null) {
      // Reset label
      valueLabel = ''
      editMode = true
    }
  }

  let showDelete
  $: {
    showDelete = isNonEmptyClaimValue(savedValue)
    if (canValueBeDeleted != null) {
      showDelete = showDelete && canValueBeDeleted({ propertyClaims: entity.claims[property] })
    }
  }
</script>

{#if inputValue !== Symbol.for('moved')}
  <div class="wrapper">
    <div class="value">
      {#if inputValue === Symbol.for('removed')}
        <button
          class="undo"
          title={undoTitle}
          on:click={undo}
        >
          {@html icon('undo')}
          {I18n('undo')}
        </button>
        <DisplayModeButtons on:edit={showEditMode} />
      {:else if editMode}
        <InputComponent
          {property}
          currentValue={inputValue}
          {valueLabel}
          {datatype}
          {entity}
          bind:getInputValue
          on:keyup={onInputKeyup}
          on:save={e => save(e.detail)}
          on:close={closeEditMode}
          on:error={showError}
        />
        <EditModeButtons
          {showSave}
          {showDelete}
          {saving}
          on:save={save}
          on:cancel={closeEditMode}
          on:delete={remove}
        />
      {:else if isNonEmptyClaimValue(savedValue)}
        <DisplayComponent
          {entity}
          {property}
          value={savedValue}
          bind:valueLabel
          on:edit={showEditMode}
          on:error={showError}
        />
        {#if !fixed}
          <DisplayModeButtons on:edit={showEditMode} />
        {/if}
      {:else}
        <!-- Known case: savedValue is not set yet, after a claim was created -->
        <Spinner />
      {/if}
    </div>

    {#if specialEditActions}
      <div class="special-action">
        {#if specialEditActions === 'author-role' && value}
          <SelectAuthorRole
            bind:entity
            {property}
            {value}
            on:moved={onMoved}
          />
        {/if}
      </div>
    {/if}
    <Flash bind:state={flash} />
  </div>
{/if}

<style lang="scss">
  @import "#general/scss/utils";
  .wrapper:not(:first-child){
    margin-block-start: 1em;
  }
  .value{
    @include display-flex(row, center, center);
    /* Small screens */
    @media screen and (width < $smaller-screen){
      flex-direction: column;
      padding: 0.5em 0.2em;
      margin: 0.5em 0;
      :global(.edit-mode-buttons){
        margin-block-start: 1em;
      }
    }
  }
  .undo{
    flex: 1;
    padding: 0.6em 0;
    @include shy(0.9);
    @include bg-hover(#ddd);
  }
  .special-action:not(:empty){
    margin: 0.5em 0 0.5em 3em;
    @include display-flex(row, center, flex-start);
    min-height: 2rem;
    @include shy(0.9);
  }
</style>
