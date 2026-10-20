import { describe, expect, it } from 'vitest'
import { getArchiveColumns, tierLabels } from './archive'

describe('archive column behavior', () => {
  it('shows the full core profile columns for a close friend', () => {
    expect(getArchiveColumns('friend', false, [])).toEqual([
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
    expect(getArchiveColumns('acquaintance', false, [])).toEqual(['fullName'])
    expect(getArchiveColumns('acquaintance', true, [])).toContain('coach')
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

