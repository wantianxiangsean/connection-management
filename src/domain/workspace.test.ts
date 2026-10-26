import { describe, expect, it } from 'vitest'
import {
  addClientArtifact,
  addClientContact,
  addClientInteraction,
  addClientTodo,
  addConnection,
  attachProductToSolution,
  clearRecycleBin,
  createClientRecord,
  deleteClient,
  detachProductFromSolution,
  emptySnapshot,
  getPersonBundle,
  listActiveContacts,
  normalizeSnapshot,
  promoteReference,
  purgeExpiredPeople,
  removeClientArtifact,
  removeClientContact,
  removeClientInteraction,
  removeClientTodo,
  removeCustomField,
  reorderClientItems,
  restorePerson,
  softDeletePerson,
  toggleClientTodo,
  updateClientContact,
  updateClientTodo,
  upsertClient,
  upsertPerson,
} from './workspace'
import type { DatabaseSnapshot, Person } from './types'

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
    notes: '',
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

  it('permanently clears every person and related record in the recycle bin', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('active', '保留联系人'))
    snapshot = upsertPerson(snapshot, person('deleted', '回收站联系人'))
    snapshot = softDeletePerson(snapshot, 'deleted', '2026-10-01T00:00:00Z')
    snapshot.connections.push({
      id: 'connection-1',
      personAId: 'active',
      personBId: 'deleted',
      note: '',
    })
    snapshot.detailEntries.push({
      id: 'detail-1',
      personId: 'deleted',
      category: '生活',
      content: '会被永久删除',
      observedOn: '2026-10-01',
      followUpOn: null,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    })

    snapshot = clearRecycleBin(snapshot)

    expect(snapshot.people.map((item) => item.id)).toEqual(['active'])
    expect(snapshot.connections).toHaveLength(0)
    expect(snapshot.detailEntries).toHaveLength(0)
  })

  it('removes a custom field together with its saved values', () => {
    const snapshot = emptySnapshot()
    snapshot.customFields.push(
      {
        id: 'field-keep',
        label: '保留字段',
        type: 'text',
        options: [],
        displayOrder: 0,
        isActive: true,
      },
      {
        id: 'field-remove',
        label: '删除字段',
        type: 'text',
        options: [],
        displayOrder: 1,
        isActive: true,
      },
    )
    snapshot.customValues.push(
      {
        id: 'value-keep',
        personId: 'a',
        fieldId: 'field-keep',
        value: '保留',
      },
      {
        id: 'value-remove',
        personId: 'a',
        fieldId: 'field-remove',
        value: '删除',
      },
    )

    const next = removeCustomField(snapshot, 'field-remove')

    expect(next.customFields.map((field) => field.id)).toEqual(['field-keep'])
    expect(next.customValues.map((value) => value.id)).toEqual(['value-keep'])
  })
})

describe('clients and partners', () => {
  it('creates, updates and removes a client with its contacts', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('p1', '林知秋'))
    const client = createClientRecord({
      name: ' 青禾科技 ',
      address: ' 杭州市西湖区 ',
      categories: ['partner', 'supplier', 'partner'],
    })
    snapshot = upsertClient(snapshot, client)

    expect(snapshot.clients[0]).toMatchObject({
      name: '青禾科技',
      address: '杭州市西湖区',
      categories: ['partner', 'supplier'],
    })

    snapshot = addClientContact(snapshot, client.id, { personId: 'p1' })
    snapshot = addClientContact(snapshot, client.id, { name: ' 王经理 ' })

    expect(snapshot.clientContacts).toHaveLength(2)
    expect(snapshot.clientContacts[0]).toMatchObject({
      personId: 'p1',
      name: '林知秋',
    })
    expect(snapshot.clientContacts[1]).toMatchObject({
      personId: null,
      name: '王经理',
    })

    snapshot = removeClientContact(snapshot, snapshot.clientContacts[1].id)
    expect(snapshot.clientContacts).toHaveLength(1)

    snapshot = deleteClient(snapshot, client.id)
    expect(snapshot.clients).toHaveLength(0)
    expect(snapshot.clientContacts).toHaveLength(0)
  })

  it('rejects a person or name that is already a contact', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('p1', '林知秋'))
    const client = createClientRecord({ name: '青禾科技' })
    snapshot = upsertClient(snapshot, client)
    snapshot = addClientContact(snapshot, client.id, { personId: 'p1' })
    snapshot = addClientContact(snapshot, client.id, { name: '王经理' })

    expect(() =>
      addClientContact(snapshot, client.id, { personId: 'p1' }),
    ).toThrow('已经是该客户的联系人')
    expect(() =>
      addClientContact(snapshot, client.id, { name: '王经理' }),
    ).toThrow('已经在列表里')
  })

  it('keeps the name but drops the person link when a person is purged', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, person('p1', '林知秋'))
    const client = createClientRecord({ name: '青禾科技' })
    snapshot = upsertClient(snapshot, client)
    snapshot = addClientContact(snapshot, client.id, { personId: 'p1' })
    snapshot = softDeletePerson(snapshot, 'p1')
    snapshot = purgeExpiredPeople(snapshot, '2099-01-01')

    expect(snapshot.people).toHaveLength(0)
    expect(snapshot.clientContacts[0]).toMatchObject({
      personId: null,
      name: '林知秋',
    })
  })

  it('fills client collections for older cloud snapshots', () => {
    const legacy = { ...emptySnapshot() } as Record<string, unknown>
    delete legacy.clients
    delete legacy.clientContacts
    delete legacy.clientArtifacts
    delete legacy.clientTodos

    const normalized = normalizeSnapshot(legacy as unknown as DatabaseSnapshot)

    expect(normalized.clients).toEqual([])
    expect(normalized.clientContacts).toEqual([])
    expect(normalized.clientArtifacts).toEqual([])
    expect(normalized.clientTodos).toEqual([])
  })

  it('upgrades a single category client to multiple identities', () => {
    const legacy = {
      ...emptySnapshot(),
      clients: [
        {
          id: 'client-old',
          name: '旧客户',
          address: '',
          category: 'supplier',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    } as unknown as DatabaseSnapshot

    const normalized = normalizeSnapshot(legacy)

    expect(normalized.clients[0].categories).toEqual(['supplier'])
  })

  it('keeps projects, products, solutions and todos under a client', () => {
    let snapshot = emptySnapshot()
    const client = createClientRecord({
      name: '青禾科技',
      categories: ['customer', 'supplier'],
    })
    snapshot = upsertClient(snapshot, client)

    snapshot = addClientArtifact(snapshot, client.id, 'project', {
      name: ' 门店升级 ',
      note: ' 九月上线 ',
    })
    snapshot = addClientArtifact(snapshot, client.id, 'product', {
      name: '智能门锁',
    })
    snapshot = addClientArtifact(snapshot, client.id, 'solution', {
      name: '年度方案',
      industry: '智能硬件',
    })
    snapshot = addClientArtifact(snapshot, client.id, 'solution', {
      name: '续约方案',
    })
    snapshot = addClientTodo(snapshot, client.id, ' 寄送样品 ')

    const project = snapshot.clientArtifacts.find(
      (item) => item.kind === 'project',
    )!
    const product = snapshot.clientArtifacts.find(
      (item) => item.kind === 'product',
    )!
    const [firstSolution, secondSolution] = snapshot.clientArtifacts.filter(
      (item) => item.kind === 'solution',
    )

    expect(project).toMatchObject({ name: '门店升级', note: '九月上线' })
    expect(firstSolution).toMatchObject({
      name: '年度方案',
      industry: '智能硬件',
    })
    expect(snapshot.clientTodos[0]).toMatchObject({
      title: '寄送样品',
      done: false,
    })

    snapshot = attachProductToSolution(
      snapshot,
      firstSolution.id,
      product.id,
    )
    snapshot = attachProductToSolution(
      snapshot,
      secondSolution.id,
      product.id,
    )
    expect(snapshot.clientSolutionProducts).toHaveLength(2)

    snapshot = detachProductFromSolution(
      snapshot,
      firstSolution.id,
      product.id,
    )
    expect(snapshot.clientSolutionProducts).toHaveLength(1)
    expect(snapshot.clientSolutionProducts[0]).toMatchObject({
      solutionId: secondSolution.id,
      productId: product.id,
    })

    snapshot = removeClientArtifact(snapshot, secondSolution.id)
    expect(snapshot.clientSolutionProducts).toHaveLength(0)
    expect(
      snapshot.clientArtifacts.some((item) => item.id === secondSolution.id),
    ).toBe(false)

    snapshot = attachProductToSolution(
      snapshot,
      firstSolution.id,
      product.id,
    )
    snapshot = removeClientArtifact(snapshot, product.id)
    expect(snapshot.clientSolutionProducts).toHaveLength(0)

    const todoId = snapshot.clientTodos[0].id
    snapshot = updateClientTodo(snapshot, todoId, ' 寄送两套样品 ')
    expect(snapshot.clientTodos[0].title).toBe('寄送两套样品')
    snapshot = toggleClientTodo(snapshot, todoId)
    expect(snapshot.clientTodos[0].done).toBe(true)

    snapshot = removeClientArtifact(snapshot, project.id)
    snapshot = removeClientTodo(snapshot, todoId)
    expect(snapshot.clientArtifacts).toHaveLength(1)
    expect(snapshot.clientTodos).toHaveLength(0)

    snapshot = addClientTodo(snapshot, client.id, '回访')
    snapshot = deleteClient(snapshot, client.id)
    expect(snapshot.clientArtifacts).toHaveLength(0)
    expect(snapshot.clientSolutionProducts).toHaveLength(0)
    expect(snapshot.clientTodos).toHaveLength(0)
  })

  it('stores contact title, influence and attitude', () => {
    let snapshot = emptySnapshot()
    snapshot = upsertPerson(snapshot, {
      ...person('p1', '林知秋'),
      occupation: '产品总监',
      influence: 'strong',
    })
    const client = createClientRecord({ name: '青禾科技' })
    snapshot = upsertClient(snapshot, client)

    snapshot = addClientContact(snapshot, client.id, { personId: 'p1' })
    expect(snapshot.clientContacts[0]).toMatchObject({
      name: '林知秋',
      title: '产品总监',
      influence: 'strong',
      attitude: 'neutral',
      note: '',
    })

    snapshot = addClientContact(snapshot, client.id, {
      name: '王经理',
      title: '采购总监',
      influence: 'medium',
      attitude: 'negative',
      note: '对价格敏感',
      methods: [
        { id: 'method-1', type: 'phone', value: ' 13800138000 ' },
        { id: 'method-2', type: 'email', value: 'wang@example.com' },
        { id: 'method-3', type: 'wechat', value: '   ' },
      ],
    })
    const independent = snapshot.clientContacts[1]
    expect(independent).toMatchObject({
      title: '采购总监',
      influence: 'medium',
      attitude: 'negative',
      note: '对价格敏感',
    })
    expect(independent.methods).toEqual([
      { id: 'method-1', type: 'phone', value: '13800138000' },
      { id: 'method-2', type: 'email', value: 'wang@example.com' },
    ])

    snapshot = updateClientContact(snapshot, independent.id, {
      title: '采购负责人',
      attitude: 'positive',
      methods: [{ id: 'method-2', type: 'email', value: 'wang@example.com' }],
    })
    expect(snapshot.clientContacts[1]).toMatchObject({
      title: '采购负责人',
      influence: 'medium',
      attitude: 'positive',
      note: '对价格敏感',
    })
    expect(snapshot.clientContacts[1].methods).toEqual([
      { id: 'method-2', type: 'email', value: 'wang@example.com' },
    ])
  })

  it('records client interactions', () => {
    let snapshot = emptySnapshot()
    const client = createClientRecord({ name: '青禾科技' })
    snapshot = upsertClient(snapshot, client)

    snapshot = addClientInteraction(snapshot, client.id, {
      occurredOn: '2026-10-20',
      channel: 'meeting',
      summary: ' 聊了年度框架 ',
    })

    expect(snapshot.clientInteractions[0]).toMatchObject({
      occurredOn: '2026-10-20',
      channel: 'meeting',
      summary: '聊了年度框架',
    })

    snapshot = removeClientInteraction(
      snapshot,
      snapshot.clientInteractions[0].id,
    )
    expect(snapshot.clientInteractions).toHaveLength(0)

    snapshot = addClientInteraction(snapshot, client.id, {
      occurredOn: '2026-10-21',
      channel: 'call',
      summary: '确认报价',
    })
    snapshot = deleteClient(snapshot, client.id)
    expect(snapshot.clientInteractions).toHaveLength(0)
  })

  it('reorders contacts, artifacts, todos and interactions manually', () => {
    let snapshot = emptySnapshot()
    const client = createClientRecord({ name: '青禾科技' })
    snapshot = upsertClient(snapshot, client)

    snapshot = addClientContact(snapshot, client.id, { name: '甲' })
    snapshot = addClientContact(snapshot, client.id, { name: '乙' })
    const [firstContact, secondContact] = snapshot.clientContacts
    snapshot = reorderClientItems(snapshot, [secondContact.id, firstContact.id])
    expect(
      snapshot.clientContacts.find((item) => item.id === secondContact.id)
        ?.position,
    ).toBe(0)
    expect(
      snapshot.clientContacts.find((item) => item.id === firstContact.id)
        ?.position,
    ).toBe(1)

    snapshot = addClientArtifact(snapshot, client.id, 'project', {
      name: '项目一',
    })
    snapshot = addClientArtifact(snapshot, client.id, 'project', {
      name: '项目二',
    })
    const projects = snapshot.clientArtifacts.filter(
      (item) => item.kind === 'project',
    )
    snapshot = reorderClientItems(snapshot, [projects[0].id, projects[1].id])
    expect(
      snapshot.clientArtifacts.find((item) => item.id === projects[0].id)
        ?.position,
    ).toBe(0)
    expect(
      snapshot.clientArtifacts.find((item) => item.id === projects[1].id)
        ?.position,
    ).toBe(1)

    snapshot = addClientTodo(snapshot, client.id, '待办一')
    snapshot = addClientTodo(snapshot, client.id, '待办二')
    const [firstTodo, secondTodo] = snapshot.clientTodos
    snapshot = reorderClientItems(snapshot, [secondTodo.id, firstTodo.id])
    expect(
      snapshot.clientTodos.find((item) => item.id === secondTodo.id)?.position,
    ).toBe(0)

    snapshot = addClientInteraction(snapshot, client.id, {
      occurredOn: '2026-10-20',
      channel: 'meeting',
      summary: '第一次沟通',
    })
    snapshot = addClientInteraction(snapshot, client.id, {
      occurredOn: '2026-10-21',
      channel: 'call',
      summary: '第二次沟通',
    })
    const [firstInteraction, secondInteraction] =
      snapshot.clientInteractions
    snapshot = reorderClientItems(snapshot, [
      firstInteraction.id,
      secondInteraction.id,
    ])
    expect(
      snapshot.clientInteractions.find(
        (item) => item.id === firstInteraction.id,
      )?.position,
    ).toBe(0)
  })

  it('adds an empty industry to older client artifacts', () => {
    const legacy = {
      ...emptySnapshot(),
      clientArtifacts: [
        {
          id: 'artifact-old',
          clientId: 'client-old',
          kind: 'solution',
          name: '旧方案',
          note: '',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    } as unknown as DatabaseSnapshot

    const normalized = normalizeSnapshot(legacy)

    expect(normalized.clientArtifacts[0].industry).toBe('')
  })

  it('fills contact fields for older client contacts', () => {
    const legacy = {
      ...emptySnapshot(),
      clientContacts: [
        {
          id: 'contact-old',
          clientId: 'client-old',
          personId: null,
          name: '旧联系人',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    } as unknown as DatabaseSnapshot

    const normalized = normalizeSnapshot(legacy)

    expect(normalized.clientContacts[0]).toMatchObject({
      name: '旧联系人',
      title: '',
      influence: null,
      attitude: 'neutral',
      note: '',
      methods: [],
    })
  })
})
