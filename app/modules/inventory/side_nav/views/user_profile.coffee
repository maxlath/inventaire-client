forms_ = require 'modules/general/lib/forms'

module.exports = class UserProfile extends Backbone.Marionette.ItemView
  template: require './templates/user_profile'
  events:
    'click a.unselectUser': 'unselectUser'
    'click .unfriend': -> app.request 'unfriend', @model
    'click .cancel': -> app.request 'request:cancel', @model
    'click .discard': -> app.request 'request:discard', @model
    'click .accept': -> app.request 'request:accept', @model
    'click .request': -> app.request 'request:send', @model
    'click #editBio': 'editBio'
    'click #saveBio': 'saveBio'
    'click #cancelBio': 'cancelBio'

  behaviors:
    AlertBox: {}
    SuccessCheck: {}
    Loading: {}

  ui:
    bio: '.bio'
    bioText: 'textarea.bio'

  serializeData: ->
    attrs = @model.serializeData()
    # if attrs.mainUser and not bio?
    #   attrs.bio = _.i18n 'a few words on you?'
    # return _.log attrs

  initialize: ->
    @listenTo @model, 'change', @render.bind(@)

  onShow: ->
    @makeRoom()
    @updateBreadCrumb()

    # take care of destroying this view even on events out of this
    # view scope (ex: clicking the home button)
    @listenTo app.vent, 'inventory:change', @destroyOnInventoryChange

  unselectUser: ->
    app.execute 'show:inventory:general'

  destroyOnInventoryChange: (username)->
    unless username is @model.get('username')
      @$el.slideUp 500, @destroy.bind(@)

  onDestroy: ->
    @giveRoomBack()
    @notifyBreadCrumb()

  makeRoom: -> $('#one').addClass 'notEmpty'
  giveRoomBack: -> $('#one').removeClass 'notEmpty'

  updateBreadCrumb: ->
    app.execute 'current:username:set', @model.get('username')
  notifyBreadCrumb: ->
    app.execute 'current:username:hide'

  editBio: -> @ui.bio.toggle()
  cancelBio: -> @ui.bio.toggle()
  saveBio: ->
    bio = @ui.bioText.val()

    _.preq.start()
    .then @testBio.bind(null, bio)
    .then @updateUserBio.bind(null, bio)
    .then @ui.bio.toggle.bind(@ui.bio)
    .catch forms_.catchAlert.bind(null, @)

  testBio: (bio)->
    if bio.length > 1000
      formatErr new Error("the bio can't be longer than 1000 characters")

  updateUserBio: (bio)->
    prev = app.user.get 'bio'
    app.user.set 'bio', bio
    app.request 'user:update',
      attribute: 'bio'
      value: bio
      selector: '#usernameButton'
    .catch (err)->
      app.user.set 'bio', prev
      formatErr(err)

formatErr = (err)->
  err.selector = 'textarea.bio'
  throw err