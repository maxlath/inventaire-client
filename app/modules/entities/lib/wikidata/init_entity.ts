import app from '#app/app'
import { getTextDirection } from '#app/lib/active_languages'
import { isNonEmptyString } from '#app/lib/boolean_tests'
import { buildPath } from '#app/lib/location'
import log_ from '#app/lib/loggers'
import { getWikipediaData, getWikisourceData } from '#app/lib/wikimedia/sitelinks'
import { unprefixify } from '#app/lib/wikimedia/wikidata'
import wikipedia_ from '#app/lib/wikimedia/wikipedia'
import getBestLangValue from '#entities/lib/get_best_lang_value'

const wdHost = 'https://www.wikidata.org'

export default function () {
  const { lang } = app.user
  setWikiLinks.call(this, lang)
  setAttributes.call(this, lang)

  this.set('isWikidataEntity', true)

  return Object.assign(this, specificMethods)
}

const setWikiLinks = function (lang) {
  const updates = {
    wikidata: {
      url: `${wdHost}/entity/${this.wikidataId}`,
      wiki: `${wdHost}/wiki/${this.wikidataId}`,
      history: `${wdHost}/w/index.php?title=${this.wikidataId}&action=history`,
      merge: getWikidataItemMergeUrl(this.wikidataId),
    },
  }

  // Alias on the root, as some views expect to find a history url there
  // @ts-expect-error
  updates.history = updates.wikidata.history

  const sitelinks = this.get('sitelinks')
  if (sitelinks != null) {
    // @ts-expect-error
    updates.wikipedia = getWikipediaData(sitelinks, lang, this.originalLang)
    // @ts-expect-error
    updates.wikisource = getWikisourceData(sitelinks, lang, this.originalLang)
  }

  this.set(updates)
}

const setAttributes = function (lang) {
  let label = this.get('label')
  const wikipediaTitle = this.get('wikipedia.title')
  if ((wikipediaTitle != null) && (label == null)) {
    // If no label was found, try to use the wikipedia page title
    // remove the escaped spaces: %20
    label = decodeURIComponent(wikipediaTitle)
      // Remove the eventual desambiguation part between parenthesis
      .replace(/\s\(\w+\)/, '')

    this.set('label', label)
  }

  const { value: description, lang: descriptionLang } = getBestLangValue(lang, this.originalLang, this.get('descriptions'))
  if (description != null) {
    this.set('description', description)
    this.set('descriptionLang', descriptionLang)
  }
}

const specificMethods = {
  async getWikipediaExtract () {
    // If an extract was already fetched, we are done
    if (this.get('extract') != null) return

    const lang = this.get('wikipedia.lang')
    const title = this.get('wikipedia.title')
    if ((lang == null) || (title == null)) return

    return wikipedia_.extract(lang, title)
    .then(_setWikipediaExtractAndDescription.bind(this))
    .catch(log_.Error('setWikipediaExtract err'))
  },
}

const _setWikipediaExtractAndDescription = function (extractData) {
  const { extract, lang } = extractData
  if (isNonEmptyString(extract)) {
    this.set('extractLang', lang || '')
    this.set('extractDirection', getTextDirection(lang))
    this.set('extract', extract)
  }
}

export function getWikidataItemMergeUrl (fromUri, toUri?) {
  let fromid = unprefixify(fromUri)
  let toid
  if (toUri) {
    toid = unprefixify(toUri)
    // Recommend to merge the newest item into the oldest
    if (getWikidataItemNumeridIdNumber(toid) > getWikidataItemNumeridIdNumber(fromid)) {
      [ fromid, toid ] = [ toid, fromid ]
    }
  }
  return buildPath(`${wdHost}/wiki/Special:MergeItems`, { fromid, toid })
}

const getWikidataItemNumeridIdNumber = id => parseInt(id.split('Q')[1])
