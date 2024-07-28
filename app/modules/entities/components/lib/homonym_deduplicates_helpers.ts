import { compact, partition, pick, pluck, uniq } from 'underscore'
import { API } from '#app/api/api'
import app from '#app/app'
import { isEntityUri, isWikidataItemUri } from '#app/lib/boolean_tests'
import preq from '#app/lib/preq'
import { someMatch } from '#app/lib/utils'
import { getEntities } from '#entities/lib/entities'
import getBestLangValue from '#entities/lib/get_best_lang_value'
import { pluralize } from '#entities/lib/types/entities_types'

export async function getHomonymsEntities (entity) {
  const { labels, aliases, type, isWikidataEntity } = entity
  const terms = getSearchTermsSelection(labels, aliases)
  const hasMultiWordTerms = terms.some(isMultiWordTerm)
  const responses = await Promise.all(terms.map(searchTerm({ type, isWikidataEntity, hasMultiWordTerms })))
  const results = pluck(compact(responses), 'results').flat()
  return parseSearchResultsToHomonyms({ results, entity })
}

const searchTerm = ({ type, isWikidataEntity, hasMultiWordTerms }) => term => {
  let filter
  if (isWikidataEntity && hasMultiWordTerms && !isMultiWordTerm(term)) {
    // As multi-word terms exist, it's unlikely Wikidata entities matching
    // on a single word term would be relevant matches. But inv entities might.
    filter = 'inv'
  }
  return preq.get(API.search({
    types: pluralize(type),
    search: term,
    limit: 100,
    exact: true,
    filter,
  }))
}

const parseSearchResultsToHomonyms = async ({ results, entity }) => {
  const uris = uniq(pluck(results, 'uri'))
    .filter(result => result.uri !== entity.uri)
  // Search results entities miss their claims, so we need to fetch the full entities
  const entityRelationsUris = getRelationsUris(entity)
  const homonyms = await getEntities(uris)
  // Re-filter out uris to omit as a redirection might have brought it back
  return homonyms
  .filter(homonym => homonym.uri !== entity.uri)
  .filter(homonym => {
    return !(entityRelationsUris.includes(homonym.uri) || getRelationsUris(homonym.claims).includes(entity.uri))
  })
}

const getRelationsUris = claims => {
  // This is more dirty than with a list of properties to pick
  // but much easier to maintain in case new relation properties are added
  // Note that those properties have to be added to server/lib/wikidata/allowlisted_properties.js to arrive here
  const uris = Object.values(claims)
    .flat()
    .filter(value => isEntityUri(value))
  return uniq(uris)
}

const getSearchTermsSelection = (labels, aliases) => {
  let terms = getTerms(labels, aliases)
  if (terms.length > 10) {
    const { lang: bestAvailableLang } = getBestLangValue(app.user.lang, null, labels)
    const langsShortlist = uniq([ bestAvailableLang, 'en' ])
    labels = pick(labels, langsShortlist)
    aliases = pick(aliases, langsShortlist)
    terms = getTerms(labels, aliases)
    terms = terms.slice(0, 10)
  }
  return terms
}

const isMultiWordTerm = term => getWordsCount(term) > 1
const getWordsCount = term => term.split(' ').length

const getTerms = (labels, aliases = {}) => {
  const terms = Object.values(labels)
    .concat(Object.values(aliases).flat())
    // Order term words to not search both "foo bar" and "bar foo"
    // as words order doesn't matter
    .map(orderTermWordsAlphabetically)
  return uniq(terms)
}

const orderTermWordsAlphabetically = term => {
  return term
  .toLowerCase()
  // Remove characters known to create duplicates
  .replace(/[.]/g, '')
  .split(' ')
  .sort((a, b) => a > b ? 1 : -1)
  .join(' ')
}

function haveLabelMatch (suggestion, targetEntity) {
  return someMatch(getNormalizedLabels(suggestion), getNormalizedLabels(targetEntity))
}

const getNormalizedLabels = entity => {
  if (!entity._normalizedLabels) {
    const normalizedLabels = Object.values(entity.labels)
      .map(normalizeLabel)
      .filter(term => term.trim().length > 0)
      .map(orderTermWordsAlphabetically)
    entity._normalizedLabels = uniq(normalizedLabels)
  }
  return entity._normalizedLabels
}

const normalizeLabel = label => {
  return label.toLowerCase()
  // Replace any non-letter non-number (from any script, not just ascii as \W would do) with a space
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
  // and https://javascript.info/regexp-unicode#unicode-properties-p
  .replace(/\P{Alphabetic}+/ug, ' ')
  .replace(/\s+/g, ' ')
  .trim()
}

export function findExactMatches ({ entity, homonyms }) {
  const exactLabelMatches = homonyms.filter(homonym => haveLabelMatch(homonym, entity))
  const [ wdExactMatches, invExactMatches ] = partition(exactLabelMatches, homony => isWikidataItemUri(homony.uri))
  return { wdExactMatches, invExactMatches }
}

export function preselectLikelyDuplicates ({ entity, wdExactMatches, invExactMatches }) {
  // If there are matching wd entities, the invExactMatches might as well be homonyms from those entities
  if (entity.isWikidataEntity) {
    if (wdExactMatches.length === 0) {
      return pluck(invExactMatches, 'uri')
    }
  } else {
    if (wdExactMatches.length === 1) {
      return pluck(wdExactMatches, 'uri')
    } else if (wdExactMatches.length === 0) {
      return pluck(invExactMatches, 'uri')
    } else {
      // If there are several matching wd entities, do not pre-select any wd or inv entity
      // as the inv entities might be duplicates of other wd homonyms
    }
  }
}
