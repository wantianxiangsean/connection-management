import { describe, expect, it } from 'vitest'
import { splitIndustries } from './clients'

describe('client industries', () => {
  it('splits industries by the Chinese delimiter', () => {
    expect(splitIndustries('智能硬件、 家居 、智能硬件')).toEqual([
      '智能硬件',
      '家居',
    ])
  })

  it('ignores empty segments', () => {
    expect(splitIndustries('、  、设计')).toEqual(['设计'])
    expect(splitIndustries('')).toEqual([])
  })
})
