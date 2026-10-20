import { Lunar } from 'lunar-typescript'
import { differenceInCalendarDays } from 'date-fns'
import type { ImportantDate } from './types'

function parseYmd(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface DateOccurrence {
  date: string
  fallbackToRegularMonth: boolean
}

function lunarOccurrence(
  date: ImportantDate,
  year: number,
): DateOccurrence | null {
  const tryLunar = (month: number) => {
    try {
      const solar = Lunar.fromYmd(year, month, date.day).getSolar()
      return `${String(solar.getYear()).padStart(4, '0')}-${String(
        solar.getMonth(),
      ).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`
    } catch {
      return null
    }
  }

  const requestedMonth = date.isLeapMonth ? -date.month : date.month
  const requested = tryLunar(requestedMonth)
  if (requested) {
    return { date: requested, fallbackToRegularMonth: false }
  }

  if (date.isLeapMonth) {
    const regular = tryLunar(date.month)
    if (regular) {
      return { date: regular, fallbackToRegularMonth: true }
    }
  }

  return null
}

export function resolveNextDateOccurrence(
  date: ImportantDate,
  today: string,
): DateOccurrence | null {
  const todayDate = parseYmd(today)

  if (!date.repeatAnnually && date.year) {
    const oneTime =
      date.calendarType === 'gregorian'
        ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(
            date.day,
          ).padStart(2, '0')}`
        : lunarOccurrence({ ...date, year }, date.year)?.date ?? null
    return oneTime
      ? { date: oneTime, fallbackToRegularMonth: false }
      : null
  }

  for (let year = todayDate.getFullYear(); year <= todayDate.getFullYear() + 2; year++) {
    const occurrence =
      date.calendarType === 'gregorian'
        ? (() => {
            const candidate = new Date(year, date.month - 1, date.day)
            return candidate.getMonth() === date.month - 1
              ? toYmd(candidate)
              : null
          })()
        : lunarOccurrence(date, year)

    if (!occurrence) continue
    const candidate = typeof occurrence === 'string' ? occurrence : occurrence.date
    if (parseYmd(candidate) >= todayDate) {
      return typeof occurrence === 'string'
        ? { date: occurrence, fallbackToRegularMonth: false }
        : occurrence
    }
  }

  return null
}

export function getNextDateOccurrence(
  date: ImportantDate,
  today: string,
): string | null {
  return resolveNextDateOccurrence(date, today)?.date ?? null
}

export function getUpcomingDates(
  dates: ImportantDate[],
  today: string,
  days = 30,
) {
  const start = parseYmd(today)
  return dates
    .map((date) => ({
      date,
      occurrence: resolveNextDateOccurrence(date, today),
    }))
    .filter(
      (item): item is { date: ImportantDate; occurrence: DateOccurrence } =>
        Boolean(item.occurrence),
    )
    .filter(
      (item) =>
        differenceInCalendarDays(parseYmd(item.occurrence.date), start) <= days,
    )
    .sort((a, b) => a.occurrence.date.localeCompare(b.occurrence.date))
}

