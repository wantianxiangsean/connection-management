import { describe, expect, it } from 'vitest'
import {
  buildContactTree,
  contactDescendantIds,
  splitIndustries,
} from './clients'
import type { ClientContact } from './types'

function contact(
  id: string,
  name: string,
  position: number,
  managerId: string | null = null,
): ClientContact {
  return {
    id,
    clientId: 'client-1',
    personId: null,
    name,
    title: '',
    influence: null,
    attitude: 'neutral',
    note: '',
    methods: [],
    managerId,
    position,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('client industries', () => {
  it('splits industries by the Chinese delimiter', () => {
    expect(splitIndustries('智能硬件、 家居 、智能硬件')).toEqual([
      '智能硬件',
      '家居',
    ])
  })

  it('ignores empty segments', () => {
    expect(splitIndustries('、  、设计')).toEqual(['设计'])
    expect(splitIndustries('')).toEqual([])
  })
})

describe('client contact tree', () => {
  it('builds reporting lines and keeps unassigned people apart', () => {
    const contacts = [
      contact('boss', '总经理', 0),
      contact('sales', '销售', 1, 'boss'),
      contact('ops', '运营', 2, 'boss'),
      contact('alone', '独立顾问', 3),
    ]

    const { roots, unassigned } = buildContactTree(contacts)

    expect(roots).toHaveLength(1)
    expect(roots[0].contact.name).toBe('总经理')
    expect(roots[0].children.map((node) => node.contact.name)).toEqual([
      '销售',
      '运营',
    ])
    expect(unassigned.map((item) => item.name)).toEqual(['独立顾问'])
  })

  it('treats a missing manager as an unassigned contact', () => {
    const { roots, unassigned } = buildContactTree([
      contact('a', '甲', 0, 'deleted-manager'),
    ])

    expect(roots).toEqual([])
    expect(unassigned.map((item) => item.name)).toEqual(['甲'])
  })

  it('does not loop forever on a cyclic manager chain', () => {
    const { roots, unassigned } = buildContactTree([
      contact('a', '甲', 0, 'b'),
      contact('b', '乙', 1, 'a'),
    ])

    expect(roots).toHaveLength(1)
    expect(unassigned).toHaveLength(0)
    const childIds = roots[0].children.map((node) => node.contact.id)
    expect(childIds).toHaveLength(1)
  })

  it('lists every descendant of a contact', () => {
    const contacts = [
      contact('a', '甲', 0),
      contact('b', '乙', 1, 'a'),
      contact('c', '丙', 2, 'b'),
      contact('d', '丁', 3, 'a'),
    ]

    expect([...contactDescendantIds(contacts, 'a')].sort()).toEqual([
      'b',
      'c',
      'd',
    ])
    expect([...contactDescendantIds(contacts, 'c')]).toEqual([])
  })
})
