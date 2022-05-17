import { writable } from 'svelte/store'
import wdLang from 'wikidata-lang'
const { byCode: langByCode } = wdLang

export function alphabeticallySortedEntries (obj) {
  return Object.entries(obj)
  .sort((a, b) => a[0] > b[0] ? 1 : -1)
}

export const getNativeLangName = code => langByCode[code]?.native

export function getNonEmptyPropertyClaims (propertyClaims = []) {
  return propertyClaims
  .filter(isNonEmptyClaimValue)
}

export function getPropertyClaimsCount (propertyClaims) {
  return getNonEmptyPropertyClaims(propertyClaims).length
}

export function isEmptyClaimValue (value) {
  return value === null || value === Symbol.for('removed')
}

export const isNonEmptyClaimValue = value => !isEmptyClaimValue(value)

export const currentEditorKey = writable(null)
