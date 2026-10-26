import type {
  Client,
  ClientArtifact,
  ClientArtifactKind,
  ClientCategory,
  ClientContact,
  ClientInteraction,
  ClientSolutionProduct,
  ClientTodo,
  Connection,
  ContactAttitude,
  DatabaseSnapshot,
  Influence,
  InteractionChannel,
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

function nextPosition(items: Array<{ position: number }>) {
  return items.reduce((max, item) => Math.max(max, item.position + 1), 0)
}

function topPosition(items: Array<{ position: number }>) {
  return items.reduce((min, item) => Math.min(min, item.position - 1), 0)
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
    clients: [],
    clientContacts: [],
    clientArtifacts: [],
    clientSolutionProducts: [],
    clientInteractions: [],
    clientTodos: [],
    customFields: [],
    customValues: [],
  }
}

export function normalizeSnapshot(source: DatabaseSnapshot): DatabaseSnapshot {
  return {
    ...emptySnapshot(),
    ...source,
    clients: (source.clients ?? []).map(normalizeClient),
    clientContacts: (source.clientContacts ?? []).map(normalizeClientContact),
    clientArtifacts: (source.clientArtifacts ?? []).map((artifact) => ({
      ...artifact,
      industry: artifact.industry ?? '',
      position: artifact.position ?? 0,
    })),
    clientSolutionProducts: source.clientSolutionProducts ?? [],
    clientInteractions: (source.clientInteractions ?? []).map((item) => ({
      ...item,
      position: item.position ?? 0,
    })),
    clientTodos: (source.clientTodos ?? []).map((item) => ({
      ...item,
      position: item.position ?? 0,
    })),
  }
}

function normalizeClientContact(contact: ClientContact): ClientContact {
  return {
    ...contact,
    title: contact.title ?? '',
    influence: contact.influence ?? null,
    attitude: contact.attitude ?? 'neutral',
    note: contact.note ?? '',
    position: contact.position ?? 0,
  }
}

function normalizeClient(client: Client & { category?: ClientCategory }): Client {
  const categories: ClientCategory[] = client.categories
    ? Array.from(new Set(client.categories))
    : client.category
      ? [client.category]
      : ['customer']
  return { ...client, categories }
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

export function createClientRecord(input: {
  name: string
  address?: string
  categories?: ClientCategory[]
}): Client {
  const timestamp = nowIso()
  return {
    id: id('client'),
    name: input.name.trim(),
    address: input.address?.trim() ?? '',
    categories: Array.from(new Set(input.categories ?? ['customer'])),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function upsertClient(
  source: DatabaseSnapshot,
  client: Pick<Client, 'id' | 'name' | 'address' | 'categories'>,
) {
  const snapshot = clone(source)
  const index = snapshot.clients.findIndex((item) => item.id === client.id)
  const next: Client = {
    ...client,
    name: client.name.trim(),
    address: client.address.trim(),
    categories: Array.from(new Set(client.categories)),
    createdAt: index >= 0 ? snapshot.clients[index].createdAt : nowIso(),
    updatedAt: nowIso(),
  }
  if (index >= 0) snapshot.clients[index] = next
  else snapshot.clients.push(next)
  return snapshot
}

export function deleteClient(source: DatabaseSnapshot, clientId: string) {
  const snapshot = clone(source)
  snapshot.clients = snapshot.clients.filter((item) => item.id !== clientId)
  snapshot.clientContacts = snapshot.clientContacts.filter(
    (item) => item.clientId !== clientId,
  )
  snapshot.clientArtifacts = snapshot.clientArtifacts.filter(
    (item) => item.clientId !== clientId,
  )
  snapshot.clientSolutionProducts = snapshot.clientSolutionProducts.filter(
    (item) => item.clientId !== clientId,
  )
  snapshot.clientInteractions = snapshot.clientInteractions.filter(
    (item) => item.clientId !== clientId,
  )
  snapshot.clientTodos = snapshot.clientTodos.filter(
    (item) => item.clientId !== clientId,
  )
  return snapshot
}

interface ClientContactDetails {
  title?: string
  influence?: Influence | null
  attitude?: ContactAttitude
  note?: string
}

function contactDetails(
  target: ClientContactDetails,
  fallback: ClientContactDetails = {},
): Pick<ClientContact, 'title' | 'influence' | 'attitude' | 'note'> {
  return {
    title: (target.title ?? fallback.title ?? '').trim(),
    influence: target.influence ?? fallback.influence ?? null,
    attitude: target.attitude ?? fallback.attitude ?? 'neutral',
    note: (target.note ?? fallback.note ?? '').trim(),
  }
}

export function addClientContact(
  source: DatabaseSnapshot,
  clientId: string,
  target: ({ personId: string } & ClientContactDetails) | ({ name: string } & ClientContactDetails),
) {
  const snapshot = clone(source)
  if (!snapshot.clients.some((item) => item.id === clientId)) {
    throw new Error('客户不存在')
  }
  const position = nextPosition(
    snapshot.clientContacts.filter((item) => item.clientId === clientId),
  )

  let contact: ClientContact
  if ('personId' in target) {
    const person = snapshot.people.find((item) => item.id === target.personId)
    if (!person) throw new Error('人脉中找不到这个人')
    if (
      snapshot.clientContacts.some(
        (item) =>
          item.clientId === clientId && item.personId === target.personId,
      )
    ) {
      throw new Error('这个人已经是该客户的联系人')
    }
    contact = {
      id: id('client-contact'),
      clientId,
      personId: person.id,
      name: person.fullName,
      ...contactDetails(target, {
        title: person.occupation,
        influence: person.influence,
      }),
      position,
      createdAt: nowIso(),
    }
  } else {
    const name = target.name.trim()
    if (!name) throw new Error('请填写联系人姓名')
    if (
      snapshot.clientContacts.some(
        (item) =>
          item.clientId === clientId &&
          item.personId === null &&
          item.name === name,
      )
    ) {
      throw new Error('这个联系人已经在列表里')
    }
    contact = {
      id: id('client-contact'),
      clientId,
      personId: null,
      name,
      ...contactDetails(target),
      position,
      createdAt: nowIso(),
    }
  }

  snapshot.clientContacts.push(contact)
  return snapshot
}

export function updateClientContact(
  source: DatabaseSnapshot,
  contactId: string,
  patch: { name?: string } & ClientContactDetails,
) {
  const snapshot = clone(source)
  snapshot.clientContacts = snapshot.clientContacts.map((contact) => {
    if (contact.id !== contactId) return contact
    return {
      ...contact,
      ...contactDetails(patch, contact),
      name: patch.name?.trim() || contact.name,
    }
  })
  return snapshot
}

export function removeClientContact(
  source: DatabaseSnapshot,
  contactId: string,
) {
  const snapshot = clone(source)
  snapshot.clientContacts = snapshot.clientContacts.filter(
    (item) => item.id !== contactId,
  )
  return snapshot
}

export function addClientArtifact(
  source: DatabaseSnapshot,
  clientId: string,
  kind: ClientArtifactKind,
  input: { name: string; note?: string; industry?: string },
) {
  const snapshot = clone(source)
  if (!snapshot.clients.some((item) => item.id === clientId)) {
    throw new Error('客户不存在')
  }
  const name = input.name.trim()
  if (!name) throw new Error('请填写名称')

  const position = topPosition(
    snapshot.clientArtifacts.filter(
      (item) => item.clientId === clientId && item.kind === kind,
    ),
  )
  const timestamp = nowIso()
  snapshot.clientArtifacts.push({
    id: id('client-artifact'),
    clientId,
    kind,
    name,
    note: input.note?.trim() ?? '',
    industry: input.industry?.trim() ?? '',
    position,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies ClientArtifact)
  return snapshot
}

export function attachProductToSolution(
  source: DatabaseSnapshot,
  solutionId: string,
  productId: string,
) {
  const snapshot = clone(source)
  const solution = snapshot.clientArtifacts.find(
    (item) => item.id === solutionId && item.kind === 'solution',
  )
  const product = snapshot.clientArtifacts.find(
    (item) => item.id === productId && item.kind === 'product',
  )
  if (!solution || !product) throw new Error('方案或产品不存在')
  if (solution.clientId !== product.clientId) {
    throw new Error('方案与产品不属于同一个客户')
  }
  const exists = snapshot.clientSolutionProducts.some(
    (item) =>
      item.solutionId === solutionId && item.productId === productId,
  )
  if (!exists) {
    snapshot.clientSolutionProducts.push({
      id: id('client-solution-product'),
      clientId: solution.clientId,
      solutionId,
      productId,
    } satisfies ClientSolutionProduct)
  }
  return snapshot
}

export function detachProductFromSolution(
  source: DatabaseSnapshot,
  solutionId: string,
  productId: string,
) {
  const snapshot = clone(source)
  snapshot.clientSolutionProducts = snapshot.clientSolutionProducts.filter(
    (item) =>
      !(item.solutionId === solutionId && item.productId === productId),
  )
  return snapshot
}

export function removeClientArtifact(
  source: DatabaseSnapshot,
  artifactId: string,
) {
  const snapshot = clone(source)
  snapshot.clientArtifacts = snapshot.clientArtifacts.filter(
    (item) => item.id !== artifactId,
  )
  snapshot.clientSolutionProducts = snapshot.clientSolutionProducts.filter(
    (item) =>
      item.solutionId !== artifactId && item.productId !== artifactId,
  )
  return snapshot
}

export function addClientInteraction(
  source: DatabaseSnapshot,
  clientId: string,
  input: {
    occurredOn: string
    channel: InteractionChannel
    summary: string
  },
) {
  const snapshot = clone(source)
  if (!snapshot.clients.some((item) => item.id === clientId)) {
    throw new Error('客户不存在')
  }
  const summary = input.summary.trim()
  if (!summary) throw new Error('请填写互动内容')
  const position = topPosition(
    snapshot.clientInteractions.filter((item) => item.clientId === clientId),
  )
  snapshot.clientInteractions.push({
    id: id('client-interaction'),
    clientId,
    occurredOn: input.occurredOn,
    channel: input.channel,
    summary,
    position,
    createdAt: nowIso(),
  } satisfies ClientInteraction)
  return snapshot
}

export function removeClientInteraction(
  source: DatabaseSnapshot,
  interactionId: string,
) {
  const snapshot = clone(source)
  snapshot.clientInteractions = snapshot.clientInteractions.filter(
    (item) => item.id !== interactionId,
  )
  return snapshot
}

export function addClientTodo(
  source: DatabaseSnapshot,
  clientId: string,
  titleInput: string,
) {
  const snapshot = clone(source)
  if (!snapshot.clients.some((item) => item.id === clientId)) {
    throw new Error('客户不存在')
  }
  const title = titleInput.trim()
  if (!title) throw new Error('请填写待办内容')
  snapshot.clientTodos.push({
    id: id('client-todo'),
    clientId,
    title,
    done: false,
    position: nextPosition(
      snapshot.clientTodos.filter((item) => item.clientId === clientId),
    ),
    createdAt: nowIso(),
  } satisfies ClientTodo)
  return snapshot
}

export function updateClientTodo(
  source: DatabaseSnapshot,
  todoId: string,
  titleInput: string,
) {
  const title = titleInput.trim()
  if (!title) return source
  const snapshot = clone(source)
  snapshot.clientTodos = snapshot.clientTodos.map((item) =>
    item.id === todoId ? { ...item, title } : item,
  )
  return snapshot
}

export function toggleClientTodo(source: DatabaseSnapshot, todoId: string) {
  const snapshot = clone(source)
  snapshot.clientTodos = snapshot.clientTodos.map((item) =>
    item.id === todoId ? { ...item, done: !item.done } : item,
  )
  return snapshot
}

export function removeClientTodo(
  source: DatabaseSnapshot,
  todoId: string,
) {
  const snapshot = clone(source)
  snapshot.clientTodos = snapshot.clientTodos.filter(
    (item) => item.id !== todoId,
  )
  return snapshot
}

export function reorderClientItems(
  source: DatabaseSnapshot,
  orderedIds: string[],
) {
  const snapshot = clone(source)
  const positions = new Map(
    orderedIds.map((itemId, index) => [itemId, index]),
  )
  const applyOrder = <T extends { id: string; position: number }>(
    items: T[],
  ) =>
    items.map((item) =>
      positions.has(item.id)
        ? { ...item, position: positions.get(item.id)! }
        : item,
    )
  snapshot.clientContacts = applyOrder(snapshot.clientContacts)
  snapshot.clientArtifacts = applyOrder(snapshot.clientArtifacts)
  snapshot.clientTodos = applyOrder(snapshot.clientTodos)
  snapshot.clientInteractions = applyOrder(snapshot.clientInteractions)
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
  snapshot.clientContacts = snapshot.clientContacts.map((contact) =>
    contact.personId && idsToPurge.has(contact.personId)
      ? { ...contact, personId: null }
      : contact,
  )

  return snapshot
}
