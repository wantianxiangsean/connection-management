import type {
  CustomFieldDefinition,
} from './types'

export { tierLabels } from './types'

export type ArchiveColumn =
  | 'fullName'
  | 'role'
  | 'occupation'
  | 'region'
  | 'industry'
  | 'influence'
  | 'intimacy'
  | 'coach'
  | `custom:${string}`

const fullColumns: ArchiveColumn[] = [
  'fullName',
  'role',
  'occupation',
  'region',
  'industry',
  'influence',
  'intimacy',
  'coach',
]

export function getArchiveColumns(
  showDetails: boolean,
  customFields: CustomFieldDefinition[],
) {
  const activeCustom = customFields
    .filter((field) => field.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((field) => `custom:${field.id}` as const)

  if (!showDetails) {
    return ['fullName'] satisfies ArchiveColumn[]
  }

  return [...fullColumns, ...activeCustom]
}
