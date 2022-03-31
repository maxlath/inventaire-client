import EntityValueInput from '../editor/entity_value_input.svelte'
import EntityValueDisplay from '../editor/entity_value_display.svelte'
import StringValueInput from '../editor/string_value_input.svelte'
import StringValueDisplay from '../editor/string_value_display.svelte'
import UrlValueInput from '../editor/url_value_input.svelte'
import UrlValueDisplay from '../editor/url_value_display.svelte'
import FixedStringValueDisplay from '../editor/fixed_string_value_display.svelte'
import SimpleDayValueInput from '../editor/simple_day_value_input.svelte'
import PositiveIntegerValueInput from '../editor/positive_integer_value_input.svelte'
import ImageValueInput from '../editor/image_value_input.svelte'
import ImageValueDisplay from '../editor/image_value_display.svelte'

export const editors = {
  entity: {
    InputComponent: EntityValueInput,
    DisplayComponent: EntityValueDisplay,
    showSave: false,
  },
  string: {
    InputComponent: StringValueInput,
    DisplayComponent: StringValueDisplay,
  },
  url: {
    InputComponent: UrlValueInput,
    DisplayComponent: UrlValueDisplay,
  },
  'fixed-string': {
    // InputComponent: FixedStringValue,
    DisplayComponent: FixedStringValueDisplay,
  },
  'simple-day': {
    InputComponent: SimpleDayValueInput,
    DisplayComponent: StringValueDisplay,
  },
  'positive-integer': {
    InputComponent: PositiveIntegerValueInput,
    DisplayComponent: StringValueDisplay,
  },
  'positive-integer-string': {
    InputComponent: PositiveIntegerValueInput,
    DisplayComponent: StringValueDisplay,
  },
  image: {
    InputComponent: ImageValueInput,
    DisplayComponent: ImageValueDisplay,
  },
}