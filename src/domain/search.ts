import { matchesPersonName } from './alphabet'
import type { PersonBundle } from './types'

export function matchesPersonSearch(bundle: PersonBundle, query: string) {
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  if (!needle) return true
  if (matchesPersonName(bundle.person.fullName, query)) return true

  const values: string[] = [
    bundle.person.role,
    bundle.person.occupation,
    bundle.person.region,
    bundle.person.industry,
    bundle.person.familySummary,
    bundle.person.careerSummary,
    ...bundle.familyMembers.flatMap((item) => [item.name, item.relation, item.note]),
    ...bundle.careerEntries.flatMap((item) => [
      item.organization,
      item.title,
      item.school ?? '',
      item.major ?? '',
      item.note,
    ]),
    ...bundle.goals.flatMap((item) => [item.title, item.details ?? '']),
    ...bundle.importantDates.map((item) => item.label),
    ...bundle.detailEntries.flatMap((item) => [item.category, item.content]),
    ...bundle.connections.map((item) => item.fullName),
    ...bundle.customValues.map((item) =>
      Array.isArray(item.value) ? item.value.join(' ') : String(item.value ?? ''),
    ),
  ]

  return values.some((value) => value.toLocaleLowerCase('zh-CN').includes(needle))
}
