import { describe, expect, it } from 'vitest'
import {
  listRegionValues,
  matchesRegion,
  splitRegionValues,
} from './locations'

describe('location values', () => {
  it('splits multiple locations written with common separators', () => {
    expect(splitRegionValues('台湾、苏州，杭州;成都/深圳|北京')).toEqual([
      '台湾',
      '苏州',
      '杭州',
      '成都',
      '深圳',
      '北京',
    ])
  })

  it('merges repeated locations while preserving their first-seen order', () => {
    expect(
      listRegionValues(['台湾、苏州', '苏州', '台湾，杭州', '', ' 成都 ']),
    ).toEqual(['台湾', '苏州', '杭州', '成都'])
  })

  it('matches a person when any of their locations equals the filter', () => {
    expect(matchesRegion('台湾、苏州', '苏州')).toBe(true)
    expect(matchesRegion('台湾、苏州', '杭州')).toBe(false)
    expect(matchesRegion('台湾、苏州', '')).toBe(true)
  })
})
