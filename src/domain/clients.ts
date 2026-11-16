import type { ClientContact } from './types'

export function splitIndustries(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split('、')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

export interface ClientContactNode {
  contact: ClientContact
  children: ClientContactNode[]
}

function byContactOrder(a: ClientContact, b: ClientContact) {
  return (
    a.position - b.position || a.name.localeCompare(b.name, 'zh-CN')
  )
}

function sortNode(node: ClientContactNode) {
  node.children.sort((a, b) => byContactOrder(a.contact, b.contact))
  node.children.forEach(sortNode)
}

/**
 * Splits a client's contacts into reporting trees and the people who are not
 * part of any reporting line yet. Invalid or looping manager links are treated
 * as top level so a bad record can never hide a person.
 */
export function buildContactTree(contacts: ClientContact[]) {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]))
  const parentOf = new Map<string, string | null>()

  for (const contact of contacts) {
    const managerId = contact.managerId
    parentOf.set(
      contact.id,
      managerId && managerId !== contact.id && byId.has(managerId)
        ? managerId
        : null,
    )
  }

  for (const contact of contacts) {
    let cursor = parentOf.get(contact.id) ?? null
    const seen = new Set([contact.id])
    while (cursor) {
      if (seen.has(cursor)) {
        parentOf.set(contact.id, null)
        break
      }
      seen.add(cursor)
      cursor = parentOf.get(cursor) ?? null
    }
  }

  const nodes = new Map<string, ClientContactNode>(
    contacts.map((contact) => [contact.id, { contact, children: [] }]),
  )

  for (const contact of contacts) {
    const parentId = parentOf.get(contact.id)
    if (!parentId) continue
    nodes.get(parentId)?.children.push(nodes.get(contact.id)!)
  }

  const hasReports = (id: string) => (nodes.get(id)?.children.length ?? 0) > 0
  const roots = contacts
    .filter(
      (contact) =>
        !parentOf.get(contact.id) && hasReports(contact.id),
    )
    .map((contact) => nodes.get(contact.id)!)
  const unassigned = contacts.filter(
    (contact) =>
      !parentOf.get(contact.id) && !hasReports(contact.id),
  )

  roots.sort((a, b) => byContactOrder(a.contact, b.contact))
  roots.forEach(sortNode)
  unassigned.sort(byContactOrder)

  return { roots, unassigned }
}

export function contactDescendantIds(
  contacts: ClientContact[],
  contactId: string,
) {
  const children = new Map<string, string[]>()
  for (const contact of contacts) {
    const managerId = contact.managerId
    if (!managerId || managerId === contact.id) continue
    const list = children.get(managerId) ?? []
    list.push(contact.id)
    children.set(managerId, list)
  }

  const descendants = new Set<string>()
  const queue = [...(children.get(contactId) ?? [])]
  while (queue.length) {
    const next = queue.shift()!
    if (descendants.has(next)) continue
    descendants.add(next)
    queue.push(...(children.get(next) ?? []))
  }
  return descendants
}
