import { describe, expect, it } from 'vitest'
import { getSurnameInitial, sortBySurname } from './alphabet'

describe('surname alphabet hints', () => {
  it('uses the pinyin initial for Chinese surnames', () => {
    expect(getSurnameInitial('陈望川')).toBe('C')
    expect(getSurnameInitial('周原')).toBe('Z')
    expect(getSurnameInitial('欧阳明')).toBe('O')
  })

  it('keeps latin initials and orders records by surname pinyin', () => {
    const people = [
      { fullName: '周原' },
      { fullName: 'Ada Lovelace' },
      { fullName: '陈望川' },
      { fullName: '林知秋' },
    ]

    expect(sortBySurname(people).map((item) => item.fullName)).toEqual([
      'Ada Lovelace',
      '陈望川',
      '林知秋',
      '周原',
    ])
  })
})

