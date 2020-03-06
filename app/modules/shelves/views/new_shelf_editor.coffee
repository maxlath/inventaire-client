ShelfModel = require '../models/shelf'

error_ = require 'lib/error'
getActionKey = require 'lib/get_action_key'
{ listingsData } = require 'modules/inventory/lib/item_creation'

module.exports = Marionette.LayoutView.extend
  template: require './templates/new_shelf_editor'
  behaviors:
    BackupForm: {}

  initialize: ->
    @listingData = listingsData()['private']
    @collection = @options.collection

  events:
    'click a.cancelShelfEdition': 'hideNewShelfEditor'
    'keydown .shelfEditor': 'shelfEditorKeyAction'
    'click a#createShelf': 'createShelf'
    'click .listingChoice': 'updateListing'

  serializeData: ->
    listingsData: listingsData()
    #Default listing for a new shelf
    listingData: @listingData

  updateListing: (e)->
    if e.currentTarget? then { id: listing } = e.currentTarget
    @listingData = listingsData()[listing]
    @render()

  shelfEditorKeyAction: (e)->
    key = getActionKey e
    if key is 'esc'
      @hideNewShelfEditor()
    else if key is 'enter' and e.ctrlKey
      @createShelf()

  hideNewShelfEditor: ->
    app.execute 'reset:new:shelf'

  createShelf: ->
    name = $("#newName").val()
    description = $("#newDesc").val()
    if !name && !description then return
    _.preq.post app.API.shelves.create, { name, description, listing: @listingData.id }
    .get('shelf')
    .then (newShelf)=>
      newShelfModel = new ShelfModel newShelf
      @collection.add newShelfModel
      $("#newName").val('')
      $("#newDesc").val('')
      @hideNewShelfEditor()
    .catch _.Error('shelf creation error')

getUserId = (username) ->
  unless username then return Promise.resolve app.user.id
  app.request 'get:userId:from:username', username

getByOwner = (userId) ->
  _.preq.get app.API.shelves.byOwners userId
  .get 'shelves'
  .then (shelves)-> Object.values(shelves)
