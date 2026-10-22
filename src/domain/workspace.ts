import type {
  Connection,
  DatabaseSnapshot,
  Person,
  PersonBundle,
  RelationshipTier,
} from './types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function nowIso() {
  return new Date().toISOString()
}

export function emptySnapshot(): DatabaseSnapshot {
  return {
    people: [],
    connections: [],
    interactions: [],
    familyMembers: [],
    careerEntries: [],
    goals: [],
    importantDates: [],
    detailEntries: [],
    attachments: [],
    customFields: [],
    customValues: [],
  }
}

export function createPersonRecord(
  input: Pick<Person, 'fullName' | 'kind' | 'tier'> &
    Partial<Omit<Person, 'id' | 'fullName' | 'kind' | 'tier'>>,
): Person {
  const timestamp = nowIso()
  return {
    id: id('person'),
    kind: input.kind,
    fullName: input.fullName.trim(),
    tier: input.kind === 'contact' ? input.tier : null,
    role: input.role ?? '',
    occupation: input.occupation ?? '',
    region: input.region ?? '',
    industry: input.industry ?? '',
    influence: input.influence ?? null,
    intimacy: input.intimacy ?? null,
    influenceNote: input.influenceNote ?? '',
    intimacyNote: input.intimacyNote ?? '',
    familySummary: input.familySummary ?? '',
    careerSummary: input.careerSummary ?? '',
    company: input.company ?? '',
    school: input.school ?? '',
    major: input.major ?? '',
    notes: input.notes ?? '',
    cadenceDays: input.cadenceDays ?? null,
    snoozedUntil: input.snoozedUntil ?? null,
    firstMetOn: input.firstMetOn ?? null,
    firstMetPlace: input.firstMetPlace ?? '',
    firstMetStory: input.firstMetStory ?? '',
    avatarUrl: input.avatarUrl ?? null,
    deletedAt: null,
    createdAt: input.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export function upsertPerson(
  source: DatabaseSnapshot,
  person: Person,
): DatabaseSnapshot {
  const snapshot = clone(source)
  const index = snapshot.people.findIndex((item) => item.id === person.id)
  const next = { ...person, updatedAt: nowIso() }
  if (index >= 0) snapshot.people[index] = next
  else snapshot.people.push(next)
  return snapshot
}

export function listActiveContacts(snapshot: DatabaseSnapshot) {
  return snapshot.people
    .filter((person) => person.kind === 'contact' && !person.deletedAt)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'zh-CN'))
}

export function getPersonBundle(
  snapshot: DatabaseSnapshot,
  personId: string,
): PersonBundle | null {
  const person = snapshot.people.find((item) => item.id === personId)
  if (!person) return null

  const connections = snapshot.connections
    .filter(
      (connection) =>
        connection.personAId === personId || connection.personBId === personId,
    )
    .map((connection) => {
      const relatedId =
        connection.personAId === personId
          ? connection.personBId
          : connection.personAId
      return snapshot.people.find((item) => item.id === relatedId)
    })
    .filter((item): item is Person => Boolean(item))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'zh-CN'))

  return {
    person,
    familyMembers: snapshot.familyMembers.filter(
      (item) => item.personId === personId,
    ),
    careerEntries: snapshot.careerEntries
      .filter((item) => item.personId === personId)
      .sort((a, b) => (b.startedOn ?? '').localeCompare(a.startedOn ?? '')),
    goals: snapshot.goals.filter((item) => item.personId === personId),
    importantDates: snapshot.importantDates.filter(
      (item) => item.personId === personId,
    ),
    detailEntries: snapshot.detailEntries
      .filter((item) => item.personId === personId)
      .sort((a, b) => b.observedOn.localeCompare(a.observedOn)),
    attachments: snapshot.attachments.filter(
      (item) => item.personId === personId,
    ),
    interactions: snapshot.interactions
      .filter((item) => item.personId === personId)
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
    connections,
    customValues: snapshot.customValues.filter(
      (item) => item.personId === personId,
    ),
  }
}

export function addConnection(
  source: DatabaseSnapshot,
  personId: string,
  target: { existingPersonId: string } | { newName: string },
) {
  const snapshot = clone(source)
  if (!snapshot.people.some((person) => person.id === personId)) {
    throw new Error('当前人物不存在')
  }

  let relatedId: string
  if ('existingPersonId' in target) {
    relatedId = target.existingPersonId
    if (!snapshot.people.some((person) => person.id === relatedId)) {
      throw new Error('要添加的人物不存在')
    }
  } else {
    const name = target.newName.trim()
    if (!name) throw new Error('请填写姓名')
    const existing = snapshot.people.find(
      (person) => person.kind === 'reference' && person.fullName === name,
    )
    if (existing) {
      relatedId = existing.id
    } else {
      const reference = createPersonRecord({
        kind: 'reference',
        tier: null,
        fullName: name,
      })
      snapshot.people.push(reference)
      relatedId = reference.id
    }
  }

  if (relatedId === personId) throw new Error('不能把自己加为共同认识的人')

  const [personAId, personBId] = [personId, relatedId].sort()
  const exists = snapshot.connections.some(
    (connection) =>
      connection.personAId === personAId &&
      connection.personBId === personBId,
  )
  if (!exists) {
    snapshot.connections.push({
      id: id('connection'),
      personAId,
      personBId,
      note: '',
    } satisfies Connection)
  }

  return snapshot
}

export function removeConnection(
  source: DatabaseSnapshot,
  personId: string,
  relatedPersonId: string,
) {
  const snapshot = clone(source)
  const [personAId, personBId] = [personId, relatedPersonId].sort()
  snapshot.connections = snapshot.connections.filter(
    (connection) =>
      !(
        (connection.personAId === personAId &&
          connection.personBId === personBId) ||
        (connection.personAId === personBId &&
          connection.personBId === personAId)
      ),
  )
  const relatedPerson = snapshot.people.find(
    (person) => person.id === relatedPersonId,
  )
  const stillReferenced =
    relatedPerson?.kind !== 'reference' ||
    snapshot.connections.some(
      (connection) =>
        connection.personAId === relatedPersonId ||
        connection.personBId === relatedPersonId,
    )
  if (!stillReferenced) {
    snapshot.people = snapshot.people.filter(
      (person) => person.id !== relatedPersonId,
    )
  }
  return snapshot
}

export function promoteReference(
  source: DatabaseSnapshot,
  personId: string,
  tier: RelationshipTier,
) {
  const snapshot = clone(source)
  const index = snapshot.people.findIndex((person) => person.id === personId)
  if (index < 0) throw new Error('引用人物不存在')
  snapshot.people[index] = {
    ...snapshot.people[index],
    kind: 'contact',
    tier,
    updatedAt: nowIso(),
  }
  return snapshot
}

export function softDeletePerson(
  source: DatabaseSnapshot,
  personId: string,
  deletedAt = nowIso(),
) {
  const snapshot = clone(source)
  const index = snapshot.people.findIndex((person) => person.id === personId)
  if (index < 0) throw new Error('人物不存在')
  snapshot.people[index] = {
    ...snapshot.people[index],
    deletedAt,
    updatedAt: nowIso(),
  }
  return snapshot
}

export function restorePerson(source: DatabaseSnapshot, personId: string) {
  const snapshot = clone(source)
  const index = snapshot.people.findIndex((person) => person.id === personId)
  if (index < 0) throw new Error('人物不存在')
  snapshot.people[index] = {
    ...snapshot.people[index],
    deletedAt: null,
    updatedAt: nowIso(),
  }
  return snapshot
}

export function purgeExpiredPeople(
  source: DatabaseSnapshot,
  today: string,
  retentionDays = 30,
) {
  const cutoff = new Date(`${today}T00:00:00`)
  cutoff.setDate(cutoff.getDate() - retentionDays)
  const idsToPurge = new Set(
    source.people
      .filter(
        (person) =>
          person.deletedAt &&
          new Date(person.deletedAt) <= cutoff,
      )
      .map((person) => person.id),
  )
  return removePeopleAndRelatedData(source, idsToPurge)
}

export function clearRecycleBin(source: DatabaseSnapshot) {
  return removePeopleAndRelatedData(
    source,
    new Set(
      source.people
        .filter((person) => person.deletedAt)
        .map((person) => person.id),
    ),
  )
}

export function removeCustomField(
  source: DatabaseSnapshot,
  fieldId: string,
) {
  const snapshot = clone(source)
  snapshot.customFields = snapshot.customFields.filter(
    (field) => field.id !== fieldId,
  )
  snapshot.customValues = snapshot.customValues.filter(
    (value) => value.fieldId !== fieldId,
  )
  return snapshot
}

function removePeopleAndRelatedData(
  source: DatabaseSnapshot,
  idsToPurge: Set<string>,
) {
  const snapshot = clone(source)
  if (idsToPurge.size === 0) return snapshot

  const belongsToPurged = (personId: string) => idsToPurge.has(personId)
  snapshot.people = snapshot.people.filter(
    (person) => !idsToPurge.has(person.id),
  )
  snapshot.connections = snapshot.connections.filter(
    (item) =>
      !idsToPurge.has(item.personAId) && !idsToPurge.has(item.personBId),
  )
  snapshot.interactions = snapshot.interactions.filter(
    (item) => !belongsToPurged(item.personId),
  )
  snapshot.familyMembers = snapshot.familyMembers.filter(
    (item) => !belongsToPurged(item.personId),
  )
  snapshot.careerEntries = snapshot.careerEntries.filter(
    (item) => !belongsToPurged(item.personId),
  )
  snapshot.goals = snapshot.goals.filter(
    (item) => !belongsToPurged(item.personId),
  )
  snapshot.importantDates = snapshot.importantDates.filter(
    (item) => !belongsToPurged(item.personId),
  )
  snapshot.detailEntries = snapshot.detailEntries.filter(
    (item) => !belongsToPurged(item.personId),
  )
  snapshot.attachments = snapshot.attachments.filter(
    (item) => !belongsToPurged(item.personId),
  )
  snapshot.customValues = snapshot.customValues.filter(
    (item) => !belongsToPurged(item.personId),
  )

  return snapshot
}
