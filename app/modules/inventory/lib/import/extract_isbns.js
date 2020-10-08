import { isNormalizedIsbn, normalizeIsbn } from 'lib/isbn'
const isbnPattern = /(97(8|9))?[\d-]{9,13}([\dX])/g

export default function (text) {
  const isbns = text.match(isbnPattern)
  if (isbns == null) return []

  return isbns
  .map(getIsbnData)
  .filter(obj => isNormalizedIsbn(obj.normalizedIsbn))
  .filter(firstOccurence({}))
};

const getIsbnData = function (rawIsbn) {
  const normalizedIsbn = normalizeIsbn(rawIsbn)
  // the window.ISBN lib is made available by the isbn2 asset that
  // should have be fetched by app/modules/inventory/views/add/import
  const data = window.ISBN.parse(normalizedIsbn)
  const isInvalid = (data == null)
  const isbn13 = isInvalid ? null : data.codes.isbn13
  return { rawIsbn, normalizedIsbn, isInvalid, isbn13 }
}

const firstOccurence = normalizedIsbns13 => function (isbnData) {
  const { isbn13, isInvalid } = isbnData
  if (isInvalid) return true

  if (normalizedIsbns13[isbn13] != null) {
    return false
  } else {
    normalizedIsbns13[isbn13] = true
    return true
  }
}
