import Papa from 'papaparse'
import type {
  ImportPreview,
  ImportedRow,
  RelationshipTier,
} from './types'

const tierMap: Record<string, RelationshipTier> = {
  命友: 'soul',
  soul: 'soul',
  密友: 'close',
  close: 'close',
  好友: 'friend',
  friend: 'friend',
  认识的人: 'acquaintance',
  acquaintance: 'acquaintance',
}

export function normalizePersonName(name: string) {
  return name.replace(/\s+/g, '')
}

export function buildImportPreview(
  csv: string,
  existing: Array<{ id: string; fullName: string }>,
): ImportPreview {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  const existingByName = new Map(
    existing.map((person) => [normalizePersonName(person.fullName), person.id]),
  )

  const rows: ImportedRow[] = result.data.map((raw, index) => {
    const values = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, String(value ?? '').trim()]),
    )
    const fullName = values['姓名'] ?? values.fullName ?? ''
    const tierText = values['关系'] ?? values.tier ?? ''
    const tier = tierMap[tierText] ?? null
    const errors: string[] = []
    if (!fullName) errors.push('缺少姓名')
    if (!tier) errors.push('关系应为命友、密友、好友或认识的人')
    return {
      rowNumber: index + 2,
      fullName,
      tier,
      values,
      duplicatePersonId:
        existingByName.get(normalizePersonName(fullName)) ?? null,
      errors,
    }
  })

  return { headers: result.meta.fields ?? [], rows }
}

