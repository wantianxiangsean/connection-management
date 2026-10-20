import { differenceInCalendarDays } from 'date-fns'
import type {
  CoachStatus,
  ImportantDate,
  Interaction,
  Person,
} from './types'
import { getNextDateOccurrence } from './dates'

function getAnchor(person: Person, latestInteraction?: Interaction) {
  if (latestInteraction) return latestInteraction.occurredOn
  if (person.firstMetOn) return person.firstMetOn
  return person.createdAt.slice(0, 10)
}

export function getCoachStatus(
  person: Person,
  interactions: Interaction[],
  importantDates: ImportantDate[],
  today: string,
): CoachStatus {
  if (person.snoozedUntil && person.snoozedUntil >= today) {
    return {
      state: 'snoozed',
      label: '稍后提醒',
      reason: `已安排 ${person.snoozedUntil} 后再看`,
      daysUntilDue: null,
      priority: 25,
    }
  }

  const nextImportantDate = importantDates
    .map((date) => ({
      date,
      occurrence: getNextDateOccurrence(date, today),
    }))
    .filter(
      (item): item is { date: ImportantDate; occurrence: string } =>
        Boolean(item.occurrence),
    )
    .sort((a, b) => a.occurrence.localeCompare(b.occurrence))[0]

  const importantDays = nextImportantDate
    ? differenceInCalendarDays(
        new Date(`${nextImportantDate.occurrence}T00:00:00`),
        new Date(`${today}T00:00:00`),
      )
    : null

  if (person.cadenceDays === null) {
    return {
      state: 'unset',
      label: '未设节奏',
      reason:
        importantDays !== null && importantDays <= 30
          ? `${importantDays} 天后是${nextImportantDate.date.label}`
          : '设置联系周期后，会在这里给出提醒',
      daysUntilDue: null,
      priority: importantDays !== null && importantDays <= 30 ? 70 : 0,
    }
  }

  const latest = [...interactions].sort((a, b) =>
    b.occurredOn.localeCompare(a.occurredOn),
  )[0]
  const effectiveAnchor = new Date(
    `${getAnchor(person, latest)}T00:00:00`,
  )
  const due = new Date(effectiveAnchor)
  due.setDate(due.getDate() + person.cadenceDays)

  const daysUntilDue = differenceInCalendarDays(
    due,
    new Date(`${today}T00:00:00`),
  )

  if (daysUntilDue <= 0) {
    return {
      state: 'due',
      label: '宜联系',
      reason:
        latest && daysUntilDue < 0
          ? `比手动周期晚了 ${Math.abs(daysUntilDue)} 天`
          : '已经到了你设定的联系时间',
      daysUntilDue,
      priority: 100 + Math.abs(daysUntilDue),
    }
  }

  if (daysUntilDue <= 7) {
    return {
      state: 'soon',
      label: '近期',
      reason: `${daysUntilDue} 天后到联系周期`,
      daysUntilDue,
      priority: 60 - daysUntilDue,
    }
  }

  return {
    state: 'steady',
    label: '在节奏内',
    reason: `距离联系周期还有 ${daysUntilDue} 天`,
    daysUntilDue,
    priority: 10,
  }
}

