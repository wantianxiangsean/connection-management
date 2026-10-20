import { describe, expect, it } from 'vitest'
import { buildImportPreview, normalizePersonName } from './import'

describe('CSV import', () => {
  it('normalizes names for duplicate detection', () => {
    expect(normalizePersonName('  林 知秋 ')).toBe('林知秋')
  })

  it('marks rows whose normalized name already exists', () => {
    const preview = buildImportPreview(
      '姓名,关系,职业\n林知秋,好友,设计师\n周远,密友,律师',
      [{ id: 'p1', fullName: '林 知秋' }],
    )
    expect(preview.rows[0].duplicatePersonId).toBe('p1')
    expect(preview.rows[1].duplicatePersonId).toBeNull()
  })
})
