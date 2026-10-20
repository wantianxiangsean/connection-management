import { describe, expect, it } from 'vitest'
import { getCoachStatus } from './coach'
import type { Interaction, Person } from './types'

const person: Person = {
  id: 'p1',
  kind: 'contact',
  fullName: '林知秋',
  tier: 'close',
  role: '前同事',
  occupation: '产品负责人',
  region: '上海',
  industry: '设计',
  influence: 'medium',
  intimacy: 'close',
  influenceNote: '',
  intimacyNote: '',
  familySummary: '',
  careerSummary: '',
  cadenceDays: null,
  snoozedUntil: null,
  firstMetOn: null,
  firstMetPlace: '',
  firstMetStory: '',
  avatarUrl: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const interaction: Interaction = {
  id: 'i1',
  personId: 'p1',
  occurredOn: '2026-10-01',
  channel: 'meeting',
  summary: '喝咖啡',
}

describe('relationship coaching', () => {
  it('never invents a cadence when the owner has not set one', () => {
    expect(getCoachStatus(person, [interaction], [], '2026-10-20')).toMatchObject({
      state: 'unset',
      label: '未设节奏',
    })
  })

  it('marks a person as due after their manual cadence elapses', () => {
    expect(
      getCoachStatus({ ...person, cadenceDays: 14 }, [interaction], [], '2026-10-20'),
    ).toMatchObject({
      state: 'due',
      label: '宜联系',
    })
  })

  it('respects a snooze date', () => {
    expect(
      getCoachStatus(
        { ...person, cadenceDays: 7, snoozedUntil: '2026-10-25' },
        [interaction],
        [],
        '2026-10-20',
      ),
    ).toMatchObject({
      state: 'snoozed',
      label: '稍后提醒',
    })
  })

  it('surfaces a due detail follow-up even without a cadence', () => {
    expect(
      getCoachStatus(
        person,
        [],
        [],
        '2026-10-20',
        [
          {
            id: 'd1',
            personId: 'p1',
            category: '身体情况',
            content: '膝盖旧伤',
            observedOn: '2026-10-01',
            followUpOn: '2026-10-22',
            createdAt: '',
            updatedAt: '',
          },
        ],
        [],
      ),
    ).toMatchObject({
      state: 'soon',
      label: '近期',
      reason: '2 天后回访这条细节：膝盖旧伤',
    })
  })

  it('surfaces an approaching active goal', () => {
    expect(
      getCoachStatus(person, [], [], '2026-10-20', [], [
        {
          id: 'g1',
          personId: 'p1',
          title: '完成工作室网站',
          status: 'active',
          targetDate: '2026-10-25',
        },
      ]),
    ).toMatchObject({
      state: 'soon',
      reason: '5 天后是这个目标的节点：完成工作室网站',
    })
  })
})
