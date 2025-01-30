import cookie_ from 'js-cookie'
import app from '#app/app'
import { langs as activeLangs, type UserLang } from '#app/lib/active_languages'
import { arrayIncludes, shortLang } from '#app/lib/utils'

export function solveLang (userLanguage) {
  // querystring parameters > other settings sources
  const qsLang = app.request('querystring:get', 'lang')
  let lang: string = qsLang || userLanguage || cookie_.get('lang') || getBrowserLocalLang()
  lang = shortLang(lang)
  if ((lang != null) && arrayIncludes(activeLangs, lang)) {
    return lang satisfies UserLang
  } else {
    return 'en'
  }
}

// Adapted from: https://github.com/maxogden/browser-locale/blob/master/index.js
export const getBrowserLocalLang = function () {
  // Latest versions of Chrome and Firefox set this correctly
  if (navigator.languages && navigator.languages.length) return navigator.languages[0]
  // IE only
  if (navigator.userLanguage) return navigator.userLanguage
  // Latest versions of Chrome, Firefox, and Safari set this correctly
  return navigator.language
}
