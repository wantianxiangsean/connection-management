import { describe, expect, it } from 'vitest'
import {
  addConnection,
  emptySnapshot,
  getPersonBundle,
  listActiveContacts,
  promoteReference,
  purgeExpiredPeople,
  restorePerson,
  softDeletePerson,
  upsertPerson,
} from './workspace'
import type { Person } from './types'

function person(id: string, fullName: string): Person {
  return {
    id,
    kind: 'contact',
    fullName,
    tier: 'friend',
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
}

describe('workspace relationships', () => {
  it('creates one reciprocal edge for two contacts', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('a', '林知秋'))
    snapshot = upsertPerson(snapshot, person('b', '周远'))
    snapshot = addConnection(snapshot, 'a', { existingPersonId: 'b' })
    snapshot = addConnection(snapshot, 'a', { existingPersonId: 'b' })

    expect(snapshot.connections).toHaveLength(1)
    expect(getPersonBundle(snapshot, 'a')?.connections[0].fullName).toBe('周远')
    expect(getPersonBundle(snapshot, 'b')?.connections[0].fullName).toBe('林知秋')
  })

  it('keeps a newly named acquaintance outside the archive', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('a', '林知秋'))
    snapshot = addConnection(snapshot, 'a', { newName: '何叔叔' })

    expect(listActiveContacts(snapshot)).toHaveLength(1)
    expect(snapshot.people.find((item) => item.fullName === '何叔叔')?.kind).toBe(
      'reference',
    )
  })

  it('promotes a reference without losing connections', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('a', '林知秋'))
    snapshot = addConnection(snapshot, 'a', { newName: '何叔叔' })
    const reference = snapshot.people.find((item) => item.kind === 'reference')!

    snapshot = promoteReference(snapshot, reference.id, 'close')

    expect(snapshot.people.find((item) => item.id === reference.id)).toMatchObject({
      kind: 'contact',
      tier: 'close',
    })
    expect(snapshot.connections).toHaveLength(1)
  })
})

describe('workspace deletion lifecycle', () => {
  it('soft deletes and restores the complete person bundle', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('a', '林知秋'))
    snapshot.detailEntries.push({
      id: 'detail-1',
      personId: 'a',
      category: '生活',
      content: '喜欢燕麦拿铁',
      observedOn: '2026-10-01',
      followUpOn: null,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    })

    snapshot = softDeletePerson(snapshot, 'a', '2026-10-01T00:00:00Z')
    expect(listActiveContacts(snapshot)).toHaveLength(0)
    expect(getPersonBundle(snapshot, 'a')?.person.deletedAt).toBeTruthy()

    snapshot = restorePerson(snapshot, 'a')
    expect(getPersonBundle(snapshot, 'a')?.detailEntries).toHaveLength(1)
  })

  it('purges only people whose 30-day recovery window expired', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('a', '旧档案'))
    snapshot = upsertPerson(snapshot, person('b', '新档案'))
    snapshot = softDeletePerson(snapshot, 'a', '2026-09-01T00:00:00Z')
    snapshot = softDeletePerson(snapshot, 'b', '2026-10-01T00:00:00Z')

    snapshot = purgeExpiredPeople(snapshot, '2026-10-20')

    expect(snapshot.people.map((item) => item.id)).toEqual(['b'])
  })
})

