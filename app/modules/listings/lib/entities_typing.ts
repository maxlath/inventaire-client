import { typesBySection } from '#search/lib/search_sections'

const { work, serie, author, publisher } = typesBySection.entity

const searchTypesByListingType = {
  work: [ work, serie ],
  author: [ author ],
  publisher: [ publisher ],
}

export const getSearchType = listingType => searchTypesByListingType[listingType]

export const listingTypeByEntitiesTypes = {
  work: 'work',
  serie: 'work',
  human: 'author',
  publisher: 'publisher',
}

const i18nTypesKeys = {
  work: 'works and series',
  author: 'authors',
  publisher: 'publishers',
}

export const getI18nTypeKey = listingType => i18nTypesKeys[listingType]

const i18nSearchPlaceholderKeys = {
  work: 'Search for works or series',
  author: 'Search for authors',
  publisher: 'Search for publishers',
}

export const getI18nSearchPlaceholder = listingType => i18nSearchPlaceholderKeys[listingType]
