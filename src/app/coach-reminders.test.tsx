import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { emptySnapshot } from '../domain/workspace'
import { App } from './App'
import { queryClient } from './WorkspaceContext'
import { LocalRepository } from '../data/local-repository'
import type {
  DatabaseSnapshot,
  Person,
  RelationshipTier,
} from '../domain/types'

function makePerson(
  id: string,
  fullName: string,
  tier: RelationshipTier,
): Person {
  return {
    id,
    kind: 'contact',
    fullName,
    tier,
    role: '',
    occupation: '',
    region: '',
    industry: '',
    influence: null,
    intimacy: null,
    influenceNote: '',
    intimacyNote: '',
    familySummary: '',
    careerSummary: '',
    notes: '',
    cadenceDays: null,
    snoozedUntil: null,
    firstMetOn: null,
    firstMetPlace: '',
    firstMetStory: '',
    avatarUrl: null,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function birthday(personId: string) {
  const tomorrow = addDays(new Date(), 1)
  return {
    id: `date-${personId}`,
    personId,
    label: '生日',
    calendarType: 'gregorian' as const,
    month: tomorrow.getMonth() + 1,
    day: tomorrow.getDate(),
    year: 1990,
    isLeapMonth: false,
    repeatAnnually: true,
    note: '',
  }
}

function renderArchive(snapshot: DatabaseSnapshot) {
  const repository = new LocalRepository({
    storage: localStorage,
    key: 'coach-reminder-test',
    seed: false,
  })
  repository.cache(snapshot)
  render(<App repository={repository} />)
}

describe('relationship coach reminders', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
    window.location.hash = ''
  })

  it('keeps acquaintance and weak-tie dates out of the reminder box', async () => {
    const user = userEvent.setup()
    renderArchive({
      ...emptySnapshot(),
      people: [
        makePerson('p-acq', '阿认', 'acquaintance'),
        makePerson('p-weak', '阿弱', 'weak'),
        makePerson('p-friend', '阿友', 'friend'),
      ],
      importantDates: ['p-acq', 'p-weak', 'p-friend'].map(birthday),
    })

    const coach = await screen.findByRole('region', { name: '关系教练' })
    await user.click(within(coach).getByRole('button', { name: '未来7天' }))

    expect(within(coach).getByText('阿友')).toBeInTheDocument()
    expect(within(coach).queryByText('阿认')).not.toBeInTheDocument()
    expect(within(coach).queryByText('阿弱')).not.toBeInTheDocument()
  })

  it('still shows follow-up reminders for weak ties', async () => {
    const user = userEvent.setup()
    const tomorrow = addDays(new Date(), 1)
    const followUpOn = `${tomorrow.getFullYear()}-${String(
      tomorrow.getMonth() + 1,
    ).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    renderArchive({
      ...emptySnapshot(),
      people: [makePerson('p-weak', '阿弱', 'weak')],
      detailEntries: [
        {
          id: 'detail-weak',
          personId: 'p-weak',
          category: '近况',
          content: '正在看新的工作机会',
          observedOn: '2026-10-01',
          followUpOn,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    })

    const coach = await screen.findByRole('region', { name: '关系教练' })
    await user.click(within(coach).getByRole('button', { name: '未来7天' }))

    expect(within(coach).getByText('阿弱')).toBeInTheDocument()
  })
})
