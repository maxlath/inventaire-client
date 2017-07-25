entityItems = require '../lib/entity_items'
EntityActions = require './entity_actions'

module.exports = Marionette.LayoutView.extend
  getTemplate: ->
    if @options.standalone then require './templates/edition_layout'
    else require './templates/edition_li'
  tagName: -> if @options.standalone then 'div' else 'li'
  className: ->
    base = 'edition-commons'
    if @options.standalone then "#{base} editionLayout" else "#{base} editionLi"

  regions:
    personalItemsRegion: '.personalItems'
    networkItemsRegion: '.networkItems'
    publicItemsRegion: '.publicItems'
    entityActions: '#entityActions'

  initialize: ->
    entityItems.initialize.call @

  onShow: ->
    @model.waitForWorks
    .then @render.bind(@)

  onRender: ->
    entityItems.onRender.call @
    @showEntityActions()

  serializeData: ->
    _.extend @model.toJSON(),
      standalone: @standalone
      works: if @standalone then @model.works?.map (work)-> work.toJSON()

  showEntityActions: ->
    { itemToUpdate } = @options
    @entityActions.show new EntityActions { @model, itemToUpdate }
