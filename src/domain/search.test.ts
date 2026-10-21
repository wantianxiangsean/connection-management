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
    notes: '',
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
  careerEntries: [
    {
      id: 'c1',
      personId: 'p1',
      organization: '澄野科技',
      title: '产品负责人',
      school: '浙江大学',
      major: '工业设计',
      startedOn: '2021-03-01',
      endedOn: null,
      note: '',
    },
  ],
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
    expect(matchesPersonSearch(bundle, 'lzq')).toBe(true)
    expect(matchesPersonSearch(bundle, 'lin zhi qiu')).toBe(true)
    expect(matchesPersonSearch(bundle, '上海')).toBe(true)
  })

  it('matches goals and hidden details', () => {
    expect(matchesPersonSearch(bundle, '工作室')).toBe(true)
    expect(matchesPersonSearch(bundle, '燕麦')).toBe(true)
  })

  it('matches education and career history', () => {
    expect(matchesPersonSearch(bundle, '浙江大学')).toBe(true)
    expect(matchesPersonSearch(bundle, '工业设计')).toBe(true)
    expect(matchesPersonSearch(bundle, '产品负责人')).toBe(true)
  })
})
