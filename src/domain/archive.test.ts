import { describe, expect, it } from 'vitest'
import { getArchiveColumns, tierLabels } from './archive'

describe('archive column behavior', () => {
  it('shows the full core profile columns only while details are expanded', () => {
    expect(getArchiveColumns(false, [])).toEqual(['fullName'])
    expect(getArchiveColumns(true, [])).toEqual([
      'fullName',
      'role',
      'occupation',
      'region',
      'industry',
      'influence',
      'intimacy',
      'coach',
    ])
  })

  it('shows only names for acquaintances until details are requested', () => {
    expect(getArchiveColumns(false, [])).toEqual(['fullName'])
    expect(getArchiveColumns(true, [])).toContain('coach')
  })

  it('uses the approved Chinese tier labels', () => {
    expect(tierLabels).toMatchObject({
      soul: '命友',
      close: '密友',
      friend: '好友',
      acquaintance: '认识的人',
    })
  })
})
