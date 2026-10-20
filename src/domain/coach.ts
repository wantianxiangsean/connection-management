import { differenceInCalendarDays } from 'date-fns'
import type {
  CoachStatus,
  DetailEntry,
  Goal,
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
  detailEntries: DetailEntry[] = [],
  goals: Goal[] = [],
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

  const start = new Date(`${today}T00:00:00`)
  const importantSignal = importantDates
    .map((date) => ({
      days: getNextDateOccurrence(date, today)
        ? differenceInCalendarDays(
            new Date(`${getNextDateOccurrence(date, today)}T00:00:00`),
            start,
          )
        : null,
      reason: `即将到来：${date.label}`,
      priority: 80,
    }))
    .filter(
      (item): item is { days: number; reason: string; priority: number } =>
        item.days !== null && item.days >= 0 && item.days <= 30,
    )

  const detailSignal = detailEntries
    .filter((detail) => detail.followUpOn && detail.followUpOn >= today)
    .map((detail) => ({
      days: differenceInCalendarDays(
        new Date(`${detail.followUpOn}T00:00:00`),
        start,
      ),
      reason: `${differenceInCalendarDays(
        new Date(`${detail.followUpOn}T00:00:00`),
        start,
      )} 天后回访这条细节：${detail.content}`,
      priority: 88,
    }))

  const goalSignal = goals
    .filter((goal) => goal.status === 'active' && goal.targetDate)
    .map((goal) => ({
      days: differenceInCalendarDays(
        new Date(`${goal.targetDate}T00:00:00`),
        start,
      ),
      reason: `${differenceInCalendarDays(
        new Date(`${goal.targetDate}T00:00:00`),
        start,
      )} 天后是这个目标的节点：${goal.title}`,
      priority: 84,
    }))
    .filter((signal) => signal.days >= 0 && signal.days <= 30)

  const nearSignal = [...detailSignal, ...goalSignal, ...importantSignal]
    .filter((signal) => signal.days <= 30)
    .sort((a, b) => a.days - b.days || b.priority - a.priority)[0]

  if (person.cadenceDays === null) {
    if (nearSignal) {
      return {
        state: nearSignal.days <= 7 ? 'soon' : 'steady',
        label: nearSignal.days <= 7 ? '近期' : '记着呢',
        reason: nearSignal.reason,
        daysUntilDue: nearSignal.days,
        priority: nearSignal.priority - nearSignal.days,
      }
    }
    return {
      state: 'unset',
      label: '未设节奏',
      reason: '设置联系周期后，会在这里给出提醒',
      daysUntilDue: null,
      priority: 0,
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

  if (nearSignal) {
    return {
      state: 'soon',
      label: '近期',
      reason: nearSignal.reason,
      daysUntilDue,
      priority: nearSignal.priority - nearSignal.days,
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
