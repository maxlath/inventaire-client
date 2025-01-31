import { isString } from 'underscore'
import { API } from '#app/api/api'
import app from '#app/app'
import assert_ from '#app/lib/assert_types'
import { isCouchUuid, isModel } from '#app/lib/boolean_tests'
import log_ from '#app/lib/loggers'
import preq from '#app/lib/preq'
import Item from '#inventory/models/item'
import type { ItemId } from '#server/types/item'
import { I18n, i18n } from '#user/lib/i18n'
import { getItemById } from './items'

export default {
  create (itemData) {
    log_.info(itemData, 'item data before creation')

    return preq.post(API.items.base, itemData)
    .then(log_.Info('item data after creation'))
    .then(data => {
      const model = new Item(data)
      app.user.trigger('items:change', null, model.get('listing'))
      return model
    })
  },

  async update (options) {
    // expects: items (models or ids), attribute, value
    // optional: selector
    let { item, items, attribute, value, selector } = options
    if ((items == null) && (item != null)) items = [ item ]
    assert_.array(items)
    assert_.string(attribute)
    if (selector != null) assert_.string(selector)

    items.forEach(item => {
      if (isString(item)) return
      if (isModel(item)) {
        // @ts-ignore
        item._backup = item.toJSON()
        item.set(attribute, value)
      }
    })

    const ids = items.map(getItemId)

    return preq.put(API.items.update, { ids, attribute, value })
  },

  async delete (options) {
    let confirmationText
    const { items, next, back } = options
    assert_.types([ items, next ], [ 'array', 'function' ])

    const ids = items.map(getItemId)

    const action = async () => {
      const res = await preq.post(API.items.deleteByIds, { ids })
      items.forEach(item => {
        if (isString(item)) return
        // app.user.trigger('items:change', item.get('listing'), null)
        item.hasBeenDeleted = true
      })
      return next(res)
    }

    if ((items.length === 1)) {
      let title
      const item = items[0]
      if (isModel(item)) {
        title = item.get('snapshot.entity:title')
      } else if (isCouchUuid(item)) {
        const serializedItem = await getItemById(item as ItemId)
        title = serializedItem.title
      } else {
        title = item.snapshot?.['entity:title']
      }
      confirmationText = i18n('delete_item_confirmation', { title })
    } else {
      confirmationText = i18n('delete_items_confirmation', { amount: ids.length })
    }

    const warningText = I18n('cant_undo_warning')

    app.execute('ask:confirmation', { confirmationText, warningText, action, back })
  },
}

const getItemId = item => {
  if (isString(item)) return item
  // Support both models and item docs
  else return item.id || item._id
}
