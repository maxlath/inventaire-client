import { serializeShelf } from '#shelves/lib/shelves'
import { i18n } from '#user/lib/i18n'

export const serializeShelfData = (shelf, withoutShelf) => {
  let name, description, pathname, title, picture, iconData, iconLabel, isEditable, visibility

  if (withoutShelf) {
    name = title = i18n('Items without shelf')
    description = ''
    pathname = '/shelves/without'
  } else {
    ;({ name, description } = shelf)
    ;({ pathname, picture, iconData, iconLabel, isEditable, visibility } = serializeShelf(shelf))
    title = `${name}${description ? ` - ${description}` : ''}`
  }

  return { name, description, pathname, title, picture, iconData, iconLabel, isEditable, visibility }
}
