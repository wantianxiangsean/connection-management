import { describe, expect, it } from 'vitest'
import { getNextDateOccurrence, getUpcomingDates } from './dates'
import type { ImportantDate } from './types'

const birthday: ImportantDate = {
  id: 'd1',
  personId: 'p1',
  label: '生日',
  calendarType: 'gregorian',
  month: 10,
  day: 24,
  year: 1990,
  isLeapMonth: false,
  repeatAnnually: true,
  note: '',
}

describe('important dates', () => {
  it('finds the next Gregorian occurrence', () => {
    expect(getNextDateOccurrence(birthday, '2026-10-20')).toBe('2026-10-24')
  })

  it('rolls a Gregorian date into the next year', () => {
    expect(getNextDateOccurrence(birthday, '2026-11-01')).toBe('2027-10-24')
  })

  it('converts a lunar date to its Gregorian occurrence', () => {
    const lunarBirthday: ImportantDate = {
      ...birthday,
      calendarType: 'lunar',
      month: 8,
      day: 15,
      year: null,
    }
    expect(getNextDateOccurrence(lunarBirthday, '2026-10-20')).toBe('2027-09-15')
  })

  it('returns only dates due within the reminder window', () => {
    expect(getUpcomingDates([birthday], '2026-10-20', 30)).toHaveLength(1)
  })
})

