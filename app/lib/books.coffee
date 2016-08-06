books_ = sharedLib('books')(_)

books_.getImage = (entityUri, data)->
  _.preq.get app.API.entities.getImages(entityUri, data)
  .get 'images'

books_.getIsbnEntities = (isbns)->
  isbns = isbns.map books_.normalizeIsbn
  _.preq.get app.API.entities.isbns(isbns)
  .catch _.Error('getIsbnEntities err')

books_.getIsbnData = (isbn)-> _.preq.get app.API.data.isbn(isbn)

module.exports = books_