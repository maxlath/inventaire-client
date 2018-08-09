module.exports = (type)-> (search, limit)->
  _.preq.get app.API.entities.searchType(type, search, limit)
  .get 'results'
  .map formatResult

formatResult = (result)->
  result.id or= result._id
  return result
