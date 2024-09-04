import { omit } from 'underscore'
import { buildPath } from '#app/lib/location'
import { fixedEncodeURIComponent } from '#app/lib/utils'
import type { SimplifiedSitelinks } from '#server/types/entity'
import type { WikimediaLanguageCode } from 'wikibase-sdk'

// lang: the user's lang
// original lang: the entity's original lang
export function getWikipediaData (sitelinks: SimplifiedSitelinks, lang: WikimediaLanguageCode, originalLang: WikimediaLanguageCode) {
  // Wikimedia Commons is confusingly using a sitelink key that makes it look like
  // a Wikipedia sitelink - commonswiki - thus the need to omit it before proceeding
  // https://www.wikidata.org/wiki/Help:Sitelinks#Linking_to_Wikimedia_site_pages
  sitelinks = omit(sitelinks, 'commonswiki')
  return getBestWikiProjectInfo({
    sitelinks,
    projectBaseName: 'wiki',
    projectRoot: 'wikipedia',
    lang,
    originalLang,
  })
}

export function getWikisourceData (sitelinks: SimplifiedSitelinks, lang: WikimediaLanguageCode, originalLang: WikimediaLanguageCode) {
  const wsData = getBestWikiProjectInfo({
    sitelinks,
    projectBaseName: 'wikisource',
    projectRoot: 'wikisource',
    lang,
    originalLang,
  })
  if (wsData != null) {
    wsData.epub = getEpubLink(wsData)
    return wsData
  }
}

interface WikisourceData {
  title: string
  lang: string
  url: string
  epub?: string
}

function getBestWikiProjectInfo (params) {
  const { sitelinks, projectBaseName, projectRoot, lang, originalLang } = params
  if (sitelinks == null) return

  const getTitleForLang = Lang => getWikiProjectTitle(sitelinks, projectBaseName, Lang)

  let [ title, langCode ] = [ getTitleForLang(lang), lang ]

  if ((originalLang != null) && (title == null)) {
    [ title, langCode ] = [ getTitleForLang(originalLang), originalLang ]
  }

  if (title == null) {
    [ title, langCode ] = [ getTitleForLang('en'), 'en' ]
  }

  if (title == null) {
    [ title, langCode ] = pickOneWikiProjectTitle(sitelinks, projectBaseName)
  }

  if ((title != null) && langCode) {
    title = fixedEncodeURIComponent(title)
    const url = `https://${langCode}.${projectRoot}.org/wiki/${title}`
    const wikisourceData: WikisourceData = { title, lang: langCode, url }
    return wikisourceData
  }
}

const getWikiProjectTitle = (sitelinks, projectBaseName, lang) => sitelinks[`${lang}${projectBaseName}`]?.title

function pickOneWikiProjectTitle (sitelinks, projectBaseName) {
  for (const projectName in sitelinks) {
    const value = sitelinks[projectName]
    const match = projectName.split(projectBaseName)
    // ex: 'lawikisource'.split 'wikisource' == ['la', '']
    // The second part needs to be an empty string to avoid confusing
    // a sitelink like : for dewiki
    if ((match.length === 2) && (match[1] === '')) {
      const langCode = match[0]
      // Giving priority to 2 letters code languages
      if (langCode.length === 2) return [ value, langCode ]
    }
  }

  return []
}

function getEpubLink (wikisourceData) {
  const { title, lang } = wikisourceData
  return buildPath('http://wsexport.wmflabs.org/tool/book.php', {
    lang,
    format: 'epub',
    page: title,
  })
}
