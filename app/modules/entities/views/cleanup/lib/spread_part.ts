import { isPositiveIntegerString } from '#app/lib/boolean_tests'
import type { SerializedEntity } from '#app/modules/entities/lib/entities'

export function spreadParts (parts: SerializedEntity[]) {
  const worksWithoutOrdinal = []
  const worksInConflicts = []
  const worksWithOrdinal = []
  let maxOrdinal = 0
  for (const part of parts) {
    const { serieOrdinal } = part
    if (isPositiveIntegerString(serieOrdinal)) {
      const ordinalInt = parseInt(serieOrdinal)
      if (ordinalInt > maxOrdinal) maxOrdinal = ordinalInt
      part.serieOrdinalNum = ordinalInt
      const currentOrdinalValue = worksWithOrdinal[ordinalInt]
      if (currentOrdinalValue != null) {
        worksInConflicts.push(part)
      } else {
        worksWithOrdinal.push(part)
      }
    } else {
      worksWithoutOrdinal.push(part)
    }
  }
  return { worksWithOrdinal, worksWithoutOrdinal, worksInConflicts, maxOrdinal }
}
