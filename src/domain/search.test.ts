import { describe, expect, it } from 'vitest'
import { matchesPersonSearch } from './search'
import type { PersonBundle } from './types'

const bundle = {
  person: {
    id: 'p1',
    kind: 'contact',
    fullName: '林知秋',
    tier: 'friend',
    role: '前同事',
    occupation: '设计师',
    region: '上海',
    industry: '科技',
    influence: 'medium',
    intimacy: 'medium',
    influenceNote: '',
    intimacyNote: '',
    familySummary: '有一个女儿',
    careerSummary: '',
    cadenceDays: null,
    snoozedUntil: null,
    firstMetOn: null,
    firstMetPlace: '',
    firstMetStory: '',
    avatarUrl: null,
    deletedAt: null,
    createdAt: '',
    updatedAt: '',
  },
  familyMembers: [],
  careerEntries: [],
  goals: [{ id: 'g1', personId: 'p1', title: '筹备工作室', status: 'active' }],
  importantDates: [],
  detailEntries: [
    {
      id: 'dt1',
      personId: 'p1',
      category: '早餐',
      content: '喜欢燕麦拿铁',
      observedOn: '2026-10-01',
      followUpOn: null,
      createdAt: '',
      updatedAt: '',
    },
  ],
  attachments: [],
  interactions: [],
  connections: [],
  customValues: [],
} satisfies PersonBundle

describe('global profile search', () => {
  it('matches names and core fields', () => {
    expect(matchesPersonSearch(bundle, '知秋')).toBe(true)
    expect(matchesPersonSearch(bundle, '上海')).toBe(true)
  })

  it('matches goals and hidden details', () => {
    expect(matchesPersonSearch(bundle, '工作室')).toBe(true)
    expect(matchesPersonSearch(bundle, '燕麦')).toBe(true)
  })
})

