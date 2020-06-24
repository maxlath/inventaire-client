{ buildPath } = require 'lib/location'
EntitiesListElementCandidate = require './entities_list_element_candidate'
typeSearch = require 'modules/entities/lib/search/type_search'
PaginatedEntities = require 'modules/entities/collections/paginated_entities'
cantTypeSearch = [
  'edition'
]

module.exports = Marionette.CompositeView.extend
  id: 'entitiesListAdder'
  template: require './templates/entities_list_adder'
  childViewContainer: '.entitiesListElementCandidates'
  childView: EntitiesListElementCandidate
  childViewOptions: ->
    parentModel: @options.parentModel
    listCollection: @options.listCollection
  emptyView: require 'modules/entities/views/editor/autocomplete_no_suggestion'

  ui:
    candidates: '.entitiesListElementCandidates'

  initialize: ->
    { @type, @parentModel } = @options
    @cantTypeSearch = @type in cantTypeSearch
    @setEntityCreationData()
    @collection = new PaginatedEntities null, { uris: [] }
    @addCandidates()

  serializeData: ->
    parent: @parentModel.toJSON()
    header: @options.header
    createPath: @createPath
    cantTypeSearch: @cantTypeSearch

  onShow: ->
    app.execute 'modal:open'
    # Doesn't work if set in events for some reason
    @ui.candidates.on 'scroll', @onScroll.bind(@)

  events:
    'click .create': 'create'
    'click .done': -> app.execute 'modal:close'
    'keydown #searchCandidates': 'lazySearch'

  setEntityCreationData: ->
    { parentModel } = @
    { type: parentType } = parentModel

    claims = {}
    prop = parentModel.childrenClaimProperty
    claims[prop] = [ parentModel.get('uri') ]

    if parentType is 'serie'
      claims['wdt:P50'] = parentModel.get 'claims.wdt:P50'

    else if parentType is 'collection'
      claims['wdt:P123'] = parentModel.get 'claims.wdt:P123'

    href = buildPath '/entity/new', { @type, claims }

    @createPath = href
    @_entityCreationData = { @type, claims }

  lazySearch: (e)->
    @_lazySearch ?= _.debounce @search.bind(@), 200
    @_lazySearch(e)

  search: (e)->
    { value: input } = e.currentTarget

    if input is '' and @_lastInput?
      @_lastInput = null
      @addCandidates()

    @_lastInput = input
    typeSearch @type, input
    .then (results)=>
      # Ignore the results if the input changed
      if input isnt @_lastInput then return
      uris = _.pluck results, 'uri'
      return @resetFromUris uris

  addCandidates: ->
    unless @parentModel.getChildrenCandidatesUris? then return

    @$el.addClass 'fetching'
    @_waitForParentModelChildrenCandidatesUris ?= @parentModel.getChildrenCandidatesUris()

    @_waitForParentModelChildrenCandidatesUris
    .then @resetFromUris.bind(@)

  resetFromUris: (uris)->
    @$el.removeClass 'fetching'
    @collection.resetFromUris uris

  onScroll: (e)->
    visibleHeight = @ui.candidates.height()
    { scrollHeight, scrollTop } = e.currentTarget
    scrollBottom = scrollTop + visibleHeight
    if scrollBottom is scrollHeight then @collection.fetchMore()

  create: (e)->
    if _.isOpenedOutside e then return
    app.execute 'show:entity:create', @_entityCreationData
    app.execute 'modal:close'
