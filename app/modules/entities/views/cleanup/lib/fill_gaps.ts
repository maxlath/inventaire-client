import { last, pluck } from 'underscore'
import { arrayIncludes } from '#app/lib/utils'
import type { SerializedEntity } from '#app/modules/entities/lib/entities'
import type { EntityUri, EntityValue, SimplifiedClaims } from '#server/types/entity'

export interface SeriePartPlaceholder {
  type: 'work'
  label: string
  claims: SimplifiedClaims
  serieOrdinalNum: number
  isPlaceholder: true
}

export function fillGaps (worksWithOrdinal: (SerializedEntity | SeriePartPlaceholder)[], serieUri: EntityUri, serieLabel: string, titlePattern: string, titleKey: string, numberKey: string, partsNumber = 0) {
  const existingOrdinals = pluck(worksWithOrdinal, 'serieOrdinalNum')
  const lastOrdinal = last(existingOrdinals)
  const end = Math.max(partsNumber, lastOrdinal)
  if (end < 1) return worksWithOrdinal
  function getPlaceholderTitle (index: number) {
    return titlePattern
    .replace(titleKey, serieLabel)
    .replace(numberKey, index.toString())
  }
  const newPlaceholders = []
  for (let i = 0; i <= end; i++) {
    if (!arrayIncludes(existingOrdinals, i)) newPlaceholders.push(getPlaceholder(i, serieUri, getPlaceholderTitle))
  }
  return worksWithOrdinal.concat(newPlaceholders)
}

function getPlaceholder (index: number, serieUri: EntityUri, getPlaceholderTitle) {
  const label = getPlaceholderTitle(index)
  const claims = {
    'wdt:P179': [ serieUri as EntityValue ],
    'wdt:P1545': [ `${index}` as `${number}` ],
  }
  const placeholder: SeriePartPlaceholder = {
    type: 'work',
    label,
    claims,
    serieOrdinalNum: index,
    isPlaceholder: true,
  }
  return placeholder
}
