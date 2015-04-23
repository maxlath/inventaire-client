module.exports = ->
  _.extend @events,
    'click a.transaction': 'updateTransaction'
    'click a.listing': 'updateListing'
    'click a.remove': 'itemDestroy'

  _.extend @,
    updateTransaction: (e)->
      @updateItem 'transaction', e.target.id

    updateListing: (e)->
      @updateItem 'listing', e.target.id

    updateItem: (attribute, value)->
      app.request 'item:update',
        item: @model
        attribute: attribute
        value: value

    itemDestroy: ->
      app.request 'item:destroy',
        model: @model
        selector: @uniqueSelector
        next: -> console.log 'item deleted'

  return
