import { startLoading } from '#general/plugins/behaviors'

export function createPlaceholders () {
  if (this._placeholderCreationOngoing) return
  this._placeholderCreationOngoing = true

  const views = Object.values(this.getRegion('worksWithOrdinalRegion').currentView.children._views)
  startLoading.call(this, { selector: '#createPlaceholders', timeout: 300 })

  function createSequentially () {
    const nextView = views.shift()
    if (nextView == null) return
    // @ts-expect-error
    return nextView.create()
    .then(createSequentially)
  }

  return createSequentially()
  .then(() => {
    this._placeholderCreationOngoing = false
    return this.updatePlaceholderCreationButton()
  })
}

export function removePlaceholder (ordinalInt) {
  const existingModel = this.worksWithOrdinal.findWhere({ ordinal: ordinalInt })
  if ((existingModel != null) && existingModel.get('isPlaceholder')) {
    return this.worksWithOrdinal.remove(existingModel)
  }
}

export function removePlaceholdersAbove (num) {
  const toRemove = this.worksWithOrdinal.filter(model => model.get('isPlaceholder') && (model.get('ordinal') > num))
  return this.worksWithOrdinal.remove(toRemove)
}
