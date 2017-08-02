DeduplicateWorksList = Marionette.CollectionView.extend
  className: 'deduplicateWorksList'
  childView: require './work_li'
  tagName: 'ul'
  # Lazy empty view: not really fitting the context
  # but just showing that nothing was found
  emptyView: require 'modules/inventory/views/no_item'

module.exports = Marionette.LayoutView.extend
  className: 'deduplicateWorks'
  template: require './templates/deduplicate_works'
  regions:
    wd: '.wd-works'
    inv: '.inv-works'

  onShow: ->
    { works } = @options
    _.log works, 'works'
    { wd:wdModels, inv:invModels } = works.reduce spreadWorks, { wd: [], inv: [] }

    @showList 'wd', wdModels
    @showList 'inv', invModels

  showList: (regionName, models)->
    models.sort sortAlphabetically
    collection = new Backbone.Collection models
    @[regionName].show new DeduplicateWorksList { collection }

    # wdModels.sort sortAlphabetically
    # invModels.sort sortAlphabetically

    # @wd.show new DeduplicateWorksList { collection: wdModels }
    # @inv.show new DeduplicateWorksList { collection: invModels }

spreadWorks = (data, work)->
  prefix = work.get 'prefix'
  data[prefix].push work
  return data

sortAlphabetically = (a, b)->
  if a.get('label').toLowerCase() > b.get('label').toLowerCase() then 1
  else -1
