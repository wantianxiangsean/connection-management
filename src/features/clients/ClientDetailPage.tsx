import {
  ArrowLeft,
  GripVertical,
  MapPin,
  Pencil,
  Plus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../../app/WorkspaceContext'
import { DialogFrame } from '../../components/DialogFrame'
import { splitIndustries } from '../../domain/clients'
import {
  addClientArtifact,
  addClientContact,
  addClientInteraction,
  addClientTodo,
  attachProductToSolution,
  deleteClient,
  detachProductFromSolution,
  removeClientArtifact,
  removeClientContact,
  removeClientInteraction,
  removeClientTodo,
  reorderClientItems,
  toggleClientTodo,
  updateClientArtifact,
  updateClientContact,
  updateClientInteraction,
  updateClientTodo,
  upsertClient,
} from '../../domain/workspace'
import {
  channelLabels,
  clientArtifactLabels,
  clientCategoryLabels,
  contactAttitudeLabels,
  influenceLabels,
  tierLabels,
  type ClientArtifact,
  type ClientArtifactKind,
  type ClientContact,
  type ClientInteraction,
} from '../../domain/types'
import { ClientArtifactDialog } from './ClientArtifactDialog'
import { ClientContactDialog } from './ClientContactDialog'
import { ClientContactEditDialog } from './ClientContactEditDialog'
import { ClientDialog } from './ClientDialog'
import { ClientInteractionDialog } from './ClientInteractionDialog'
import { ClientSolutionProductDialog } from './ClientSolutionProductDialog'
import { useDragOrder } from './useDragOrder'

const artifactSections: Array<{
  kind: ClientArtifactKind
  hint: string
  empty: string
}> = [
  {
    kind: 'project',
    hint: '记录正在合作或跟进的项目。',
    empty: '还没有项目。',
  },
  {
    kind: 'product',
    hint: '记录与这个客户相关的产品或服务。',
    empty: '还没有产品。',
  },
  {
    kind: 'solution',
    hint: '整理给客户的方案，方案下可以挂客户已有的产品，一个产品可挂多个方案。',
    empty: '还没有方案。',
  },
]

type ContactTarget = Parameters<typeof addClientContact>[2]

export function ClientDetailPage() {
  const { clientId = '' } = useParams()
  const navigate = useNavigate()
  const { snapshot, update } = useWorkspace()
  const [editOpen, setEditOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ClientContact | null>(
    null,
  )
  const [removingContact, setRemovingContact] = useState<{
    contact: ClientContact
    name: string
  } | null>(null)
  const [artifactKind, setArtifactKind] = useState<ClientArtifactKind | null>(
    null,
  )
  const [editingArtifact, setEditingArtifact] =
    useState<ClientArtifact | null>(null)
  const [editingInteraction, setEditingInteraction] =
    useState<ClientInteraction | null>(null)
  const [productSolution, setProductSolution] =
    useState<ClientArtifact | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [contactError, setContactError] = useState('')
  const [todoDraft, setTodoDraft] = useState('')
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [todoEditDraft, setTodoEditDraft] = useState('')

  const reorderItems = useCallback(
    (orderedIds: string[]) => {
      update((current) => reorderClientItems(current, orderedIds))
    },
    [update],
  )
  const contactDrag = useDragOrder(reorderItems)
  const artifactDrag = useDragOrder(reorderItems)
  const todoDrag = useDragOrder(reorderItems)
  const interactionDrag = useDragOrder(reorderItems)

  const client = snapshot.clients.find((item) => item.id === clientId)

  const peopleById = useMemo(
    () => new Map(snapshot.people.map((person) => [person.id, person])),
    [snapshot.people],
  )

  const contacts = useMemo(() => {
    if (!client) return []
    return snapshot.clientContacts
      .filter((item) => item.clientId === client.id)
      .map((contact) => ({
        contact,
        person: contact.personId
          ? peopleById.get(contact.personId)
          : undefined,
      }))
      .sort(
        (a, b) =>
          a.contact.position - b.contact.position ||
          (a.person?.fullName ?? a.contact.name).localeCompare(
            b.person?.fullName ?? b.contact.name,
            'zh-CN',
          ),
      )
  }, [client, peopleById, snapshot.clientContacts])

  const candidates = useMemo(() => {
    const linked = new Set(
      contacts
        .map((item) => item.person?.id)
        .filter((id): id is string => Boolean(id)),
    )
    return snapshot.people.filter(
      (person) =>
        person.kind === 'contact' &&
        !person.deletedAt &&
        !linked.has(person.id),
    )
  }, [contacts, snapshot.people])

  const artifacts = useMemo(() => {
    if (!client) return []
    return snapshot.clientArtifacts
      .filter((item) => item.clientId === client.id)
      .sort(
        (a, b) =>
          a.position - b.position || b.createdAt.localeCompare(a.createdAt),
      )
  }, [client, snapshot.clientArtifacts])

  const solutionLinks = useMemo(() => {
    if (!client) return []
    return snapshot.clientSolutionProducts.filter(
      (item) => item.clientId === client.id,
    )
  }, [client, snapshot.clientSolutionProducts])

  const todos = useMemo(() => {
    if (!client) return []
    return snapshot.clientTodos
      .filter((item) => item.clientId === client.id)
      .sort(
        (a, b) =>
          a.position - b.position ||
          Number(a.done) - Number(b.done) ||
          a.createdAt.localeCompare(b.createdAt),
      )
  }, [client, snapshot.clientTodos])

  const interactions = useMemo(() => {
    if (!client) return []
    return snapshot.clientInteractions
      .filter((item) => item.clientId === client.id)
      .sort(
        (a, b) =>
          a.position - b.position ||
          b.occurredOn.localeCompare(a.occurredOn) ||
          b.createdAt.localeCompare(a.createdAt),
      )
  }, [client, snapshot.clientInteractions])

  if (!client) {
    return (
      <section className="not-found">
        <p className="section-overline">找不到这个客户</p>
        <h1>客户可能已被删除或移动</h1>
        <Link to="/clients" className="button primary">
          返回客户/伙伴
        </Link>
      </section>
    )
  }

  const activeClient = client
  const products = artifacts.filter((item) => item.kind === 'product')
  const solutionNames = new Map(
    artifacts
      .filter((item) => item.kind === 'solution')
      .map((solution) => [solution.id, solution.name]),
  )
  const productsBySolution = new Map<string, ClientArtifact[]>()
  const solutionsByProduct = new Map<string, string[]>()
  for (const link of solutionLinks) {
    const product = products.find((item) => item.id === link.productId)
    const solutionName = solutionNames.get(link.solutionId)
    if (product) {
      const list = productsBySolution.get(link.solutionId) ?? []
      list.push(product)
      productsBySolution.set(link.solutionId, list)
    }
    if (solutionName) {
      const list = solutionsByProduct.get(link.productId) ?? []
      list.push(solutionName)
      solutionsByProduct.set(link.productId, list)
    }
  }
  const attachedProductIds = new Set(
    productSolution
      ? solutionLinks
          .filter((link) => link.solutionId === productSolution.id)
          .map((link) => link.productId)
      : [],
  )
  const availableProducts = products.filter(
    (item) => !attachedProductIds.has(item.id),
  )
  const contactIds = contacts.map((item) => item.contact.id)
  const todoIds = todos.map((item) => item.id)
  const interactionIds = interactions.map((item) => item.id)

  function addContact(target: ContactTarget, keepOpen: boolean) {
    if (
      'name' in target &&
      contacts.some(
        (item) =>
          !item.contact.personId &&
          item.contact.name === target.name.trim(),
      )
    ) {
      setContactError('这个联系人已经在列表里')
      return false
    }
    update((current) => addClientContact(current, activeClient.id, target))
    setContactError('')
    if (!keepOpen) setContactOpen(false)
    return true
  }

  function addTodo(event: FormEvent) {
    event.preventDefault()
    const title = todoDraft.trim()
    if (!title) return
    update((current) => addClientTodo(current, activeClient.id, title))
    setTodoDraft('')
  }

  function saveTodoEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingTodoId) return
    update((current) =>
      updateClientTodo(current, editingTodoId, todoEditDraft),
    )
    setEditingTodoId(null)
    setTodoEditDraft('')
  }

  function attachProduct(productId: string) {
    if (!productSolution) return
    update((current) =>
      attachProductToSolution(current, productSolution.id, productId),
    )
    setProductSolution(null)
  }

  function confirmDelete(event: FormEvent) {
    event.preventDefault()
    update((current) => deleteClient(current, activeClient.id))
    navigate('/clients')
  }

  return (
    <main className="person-page client-detail-page">
      <header className="person-topbar">
        <Link to="/clients" className="back-link">
          <ArrowLeft size={17} aria-hidden="true" />
          返回客户/伙伴
        </Link>
        <div className="person-topbar-actions">
          <button
            type="button"
            className="button person-edit-button"
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={16} aria-hidden="true" />
            编辑
          </button>
          <button
            type="button"
            className="button ghost client-delete-button"
            onClick={() => setConfirmOpen(true)}
          >
            删除
          </button>
        </div>
      </header>

      <div className="client-detail-layout">
        <aside className="client-summary">
          <span className="client-category-list">
            {activeClient.categories.map((item) => (
              <span key={item} className={`client-category is-${item}`}>
                {clientCategoryLabels[item]}
              </span>
            ))}
          </span>
          <h1>{activeClient.name}</h1>
          <p className="client-summary-address">
            <MapPin size={15} aria-hidden="true" />
            {activeClient.address || '地址未记录'}
          </p>
          <p className="client-summary-meta">
            <Users size={15} aria-hidden="true" />
            {contacts.length} 位联系人
          </p>
        </aside>

        <div className="client-detail-main">
          <section className="client-contacts" aria-label="待办">
            <header className="client-contacts-heading">
              <div>
                <h2>待办</h2>
                <p>{todos.filter((item) => !item.done).length} 项未完成</p>
              </div>
            </header>
            <form className="client-todo-form" onSubmit={addTodo}>
              <input
                aria-label="新增待办"
                value={todoDraft}
                onChange={(event) => setTodoDraft(event.target.value)}
                placeholder="添加待办，例如：寄送样品"
              />
              <button
                type="submit"
                className="button primary"
                disabled={!todoDraft.trim()}
              >
                添加
              </button>
            </form>
            {todos.length ? (
              <ul className="client-todo-list">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    data-drag-id={todo.id}
                    className={[
                      todo.done ? 'is-done' : '',
                      editingTodoId === todo.id ? 'is-editing' : '',
                      todoDrag.draggingId === todo.id ? 'is-dragging' : '',
                      todoDrag.overId === todo.id &&
                      todoDrag.draggingId !== todo.id
                        ? 'is-drag-over'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined}
                  >
                    {editingTodoId === todo.id ? (
                      <form className="client-todo-edit" onSubmit={saveTodoEdit}>
                        <input
                          aria-label="待办内容"
                          autoFocus
                          value={todoEditDraft}
                          onChange={(event) =>
                            setTodoEditDraft(event.target.value)
                          }
                        />
                        <button
                          type="submit"
                          className="button primary"
                          disabled={!todoEditDraft.trim()}
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setEditingTodoId(null)
                            setTodoEditDraft('')
                          }}
                        >
                          取消
                        </button>
                      </form>
                    ) : (
                      <>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={todo.done}
                            onChange={() =>
                              update((current) =>
                                toggleClientTodo(current, todo.id),
                              )
                            }
                          />
                          <span>{todo.title}</span>
                        </label>
                        <div className="client-item-actions">
                          <button
                            type="button"
                            className="drag-handle"
                            aria-label={`拖动排序 ${todo.title}`}
                            onPointerDown={(event) =>
                              todoDrag.startDrag(event, todo.id, todoIds)
                            }
                          >
                            <GripVertical size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="icon-button client-contact-edit"
                            aria-label={`编辑待办 ${todo.title}`}
                            onClick={() => {
                              setEditingTodoId(todo.id)
                              setTodoEditDraft(todo.title)
                            }}
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="icon-button client-contact-remove"
                            aria-label={`删除待办 ${todo.title}`}
                            onClick={() =>
                              update((current) =>
                                removeClientTodo(current, todo.id),
                              )
                            }
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="client-section-empty">还没有待办。</p>
            )}
          </section>

          <section className="client-contacts" aria-label="联系人">
            <header className="client-contacts-heading">
              <div>
                <h2>联系人</h2>
                <p>可以从人脉档案里关联，也可以独立记录，并补充职务与态度。</p>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setContactError('')
                  setContactOpen(true)
                }}
              >
                <Plus size={17} aria-hidden="true" />
                添加联系人
              </button>
            </header>

            {contacts.length ? (
              <ul className="client-contact-list">
                {contacts.map(({ contact, person }) => {
                  const name = person?.fullName ?? contact.name
                  return (
                    <li
                      key={contact.id}
                      data-drag-id={contact.id}
                      className={
                        [
                          contactDrag.draggingId === contact.id
                            ? 'is-dragging'
                            : '',
                          contactDrag.overId === contact.id &&
                          contactDrag.draggingId !== contact.id
                            ? 'is-drag-over'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                    >
                      <div className="client-contact-body">
                        <div className="client-contact-line">
                          <strong>{name}</strong>
                          {contact.title ? (
                            <span className="client-contact-title">
                              {contact.title}
                            </span>
                          ) : null}
                        </div>
                        <div className="client-contact-meta-row">
                          {person ? (
                            <Link
                              to={`/people/${person.id}`}
                              className="client-contact-meta"
                            >
                              {person.tier
                                ? tierLabels[person.tier]
                                : '人脉档案'}
                              · 查看档案
                            </Link>
                          ) : (
                            <span className="client-contact-meta">
                              独立联系人
                            </span>
                          )}
                          {contact.influence ? (
                            <span
                              className={`contact-badge influence-${contact.influence}`}
                            >
                              影响力 {influenceLabels[contact.influence]}
                            </span>
                          ) : null}
                          <span
                            className={`contact-badge attitude-${contact.attitude}`}
                          >
                            {contactAttitudeLabels[contact.attitude]}
                          </span>
                        </div>
                        {contact.note ? (
                          <p className="client-contact-note">
                            {contact.note}
                          </p>
                        ) : null}
                      </div>
                      <div className="client-item-actions">
                        <button
                          type="button"
                          className="drag-handle"
                          aria-label={`拖动排序 ${name}`}
                          onPointerDown={(event) =>
                            contactDrag.startDrag(
                              event,
                              contact.id,
                              contactIds,
                            )
                          }
                        >
                          <GripVertical size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-button client-contact-edit"
                          aria-label={`编辑联系人 ${name}`}
                          onClick={() => setEditingContact(contact)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-button client-contact-remove"
                          aria-label={`移除 ${name}`}
                          onClick={() =>
                            setRemovingContact({ contact, name })
                          }
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="empty-state client-contacts-empty">
                <span className="empty-illustration">
                  <Users size={22} aria-hidden="true" />
                </span>
                <h2>还没有联系人</h2>
                <p>把对接人关联到人脉档案，或单独记下姓名。</p>
              </div>
            )}
          </section>

          <section className="client-contacts" aria-label="互动记录">
            <header className="client-contacts-heading">
              <div>
                <h2>互动</h2>
                <p>记录和这家公司的沟通与往来内容。</p>
              </div>
              <button
                type="button"
                className="button person-edit-button"
                onClick={() => {
                  setEditingInteraction(null)
                  setInteractionOpen(true)
                }}
              >
                <Plus size={16} aria-hidden="true" />
                新增互动
              </button>
            </header>
            {interactions.length ? (
              <ul className="client-item-list client-interaction-list">
                {interactions.map((item) => (
                  <li
                    key={item.id}
                    data-drag-id={item.id}
                    className={
                      [
                        interactionDrag.draggingId === item.id
                          ? 'is-dragging'
                          : '',
                        interactionDrag.overId === item.id &&
                        interactionDrag.draggingId !== item.id
                          ? 'is-drag-over'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                  >
                    <div>
                      <div className="client-interaction-head">
                        <strong>{item.occurredOn}</strong>
                        <span className="contact-badge channel-badge">
                          {channelLabels[item.channel]}
                        </span>
                      </div>
                      <p className="client-item-note">{item.summary}</p>
                    </div>
                    <div className="client-item-actions">
                      <button
                        type="button"
                        className="drag-handle"
                        aria-label={`拖动排序 ${item.occurredOn}`}
                        onPointerDown={(event) =>
                          interactionDrag.startDrag(
                            event,
                            item.id,
                            interactionIds,
                          )
                        }
                      >
                        <GripVertical size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button client-contact-edit"
                        aria-label={`编辑互动 ${item.occurredOn}`}
                        onClick={() => {
                          setEditingInteraction(item)
                          setInteractionOpen(true)
                        }}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button client-contact-remove"
                        aria-label={`删除互动 ${item.occurredOn}`}
                        onClick={() =>
                          update((current) =>
                            removeClientInteraction(current, item.id),
                          )
                        }
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="client-section-empty">还没有互动记录。</p>
            )}
          </section>

          {artifactSections.map((section) => {
            const items = artifacts.filter(
              (item) => item.kind === section.kind,
            )
            const label = clientArtifactLabels[section.kind]
            return (
              <section
                key={section.kind}
                className="client-contacts"
                aria-label={label}
              >
                <header className="client-contacts-heading">
                  <div>
                    <h2>{label}</h2>
                    <p>{section.hint}</p>
                  </div>
                  <button
                    type="button"
                    className="button person-edit-button"
                    onClick={() => {
                      setEditingArtifact(null)
                      setArtifactKind(section.kind)
                    }}
                  >
                    <Plus size={16} aria-hidden="true" />
                    新增{label}
                  </button>
                </header>

                {items.length ? (
                  <ul className="client-item-list">
                    {items.map((item) => {
                      const linkedSolutions =
                        solutionsByProduct.get(item.id) ?? []
                      return (
                        <li
                          key={item.id}
                          data-drag-id={item.id}
                          className={
                            [
                              artifactDrag.draggingId === item.id
                                ? 'is-dragging'
                                : '',
                              artifactDrag.overId === item.id &&
                              artifactDrag.draggingId !== item.id
                                ? 'is-drag-over'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ') || undefined
                          }
                        >
                          <div>
                            <strong>{item.name}</strong>
                            {item.note ? (
                              <p className="client-item-note">{item.note}</p>
                            ) : null}
                            {item.kind === 'solution' &&
                            splitIndustries(item.industry).length ? (
                              <span className="solution-industries">
                                <span className="solution-industries-label">
                                  行业
                                </span>
                                {splitIndustries(item.industry).map(
                                  (industry) => (
                                    <span
                                      key={industry}
                                      className="contact-badge channel-badge"
                                    >
                                      {industry}
                                    </span>
                                  ),
                                )}
                              </span>
                            ) : null}
                            {item.kind === 'product' &&
                            linkedSolutions.length ? (
                              <span className="client-item-meta">
                                已挂在「{linkedSolutions.join('」「')}」方案
                              </span>
                            ) : null}
                            {item.kind === 'solution' ? (
                              <span className="solution-products">
                                {(productsBySolution.get(item.id) ?? []).map(
                                  (product) => (
                                    <span
                                      key={product.id}
                                      className="solution-product-chip"
                                    >
                                      {product.name}
                                      <button
                                        type="button"
                                        aria-label={`从方案移除 ${product.name}`}
                                        onClick={() =>
                                          update((current) =>
                                            detachProductFromSolution(
                                              current,
                                              item.id,
                                              product.id,
                                            ),
                                          )
                                        }
                                      >
                                        <X size={12} aria-hidden="true" />
                                      </button>
                                    </span>
                                  ),
                                )}
                                <button
                                  type="button"
                                  className="text-button solution-attach-button"
                                  onClick={() => setProductSolution(item)}
                                >
                                  + 挂产品
                                </button>
                              </span>
                            ) : null}
                          </div>
                          <div className="client-item-actions">
                            <button
                              type="button"
                              className="drag-handle"
                              aria-label={`拖动排序 ${item.name}`}
                              onPointerDown={(event) =>
                                artifactDrag.startDrag(
                                  event,
                                  item.id,
                                  items.map((value) => value.id),
                                )
                              }
                            >
                              <GripVertical size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button client-contact-edit"
                              aria-label={`编辑${label} ${item.name}`}
                              onClick={() => {
                                setEditingArtifact(item)
                                setArtifactKind(item.kind)
                              }}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button client-contact-remove"
                              aria-label={`删除${label} ${item.name}`}
                              onClick={() =>
                                update((current) =>
                                  removeClientArtifact(current, item.id),
                                )
                              }
                            >
                              <X size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="client-section-empty">{section.empty}</p>
                )}
              </section>
            )
          })}
        </div>
      </div>

      <ClientDialog
        open={editOpen}
        initial={activeClient}
        onClose={() => setEditOpen(false)}
        onSave={(value) => {
          update((current) =>
            upsertClient(current, { ...activeClient, ...value }),
          )
          setEditOpen(false)
        }}
      />

      {contactOpen ? (
        <ClientContactDialog
          people={candidates}
          error={contactError}
          onClose={() => {
            setContactOpen(false)
            setContactError('')
          }}
          onSave={addContact}
        />
      ) : null}

      {interactionOpen ? (
        <ClientInteractionDialog
          initial={editingInteraction}
          onClose={() => {
            setInteractionOpen(false)
            setEditingInteraction(null)
          }}
          onSave={(value) => {
            update((current) =>
              editingInteraction
                ? updateClientInteraction(
                    current,
                    editingInteraction.id,
                    value,
                  )
                : addClientInteraction(current, activeClient.id, value),
            )
            setInteractionOpen(false)
            setEditingInteraction(null)
          }}
        />
      ) : null}

      {editingContact ? (
        <ClientContactEditDialog
          contact={editingContact}
          linkedName={
            editingContact.personId
              ? peopleById.get(editingContact.personId)?.fullName
              : undefined
          }
          onClose={() => setEditingContact(null)}
          onSave={(value) => {
            update((current) =>
              updateClientContact(current, editingContact.id, value),
            )
            setEditingContact(null)
          }}
        />
      ) : null}

      {removingContact ? (
        <DialogFrame
          title="移除联系人"
          overline="确认移除"
          onClose={() => setRemovingContact(null)}
        >
          <form
            className="stack-form confirmation-form"
            onSubmit={(event) => {
              event.preventDefault()
              update((current) =>
                removeClientContact(current, removingContact.contact.id),
              )
              setRemovingContact(null)
            }}
          >
            <div>
              <p>
                「{removingContact.name}
                」会从这家公司的联系人中移除，人脉档案里的资料不受影响。
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="button ghost"
                onClick={() => setRemovingContact(null)}
              >
                取消
              </button>
              <button type="submit" className="button danger">
                移除
              </button>
            </footer>
          </form>
        </DialogFrame>
      ) : null}

      {artifactKind ? (
        <ClientArtifactDialog
          kind={artifactKind}
          initial={editingArtifact}
          onClose={() => {
            setArtifactKind(null)
            setEditingArtifact(null)
          }}
          onSave={(value) => {
            update((current) =>
              editingArtifact
                ? updateClientArtifact(current, editingArtifact.id, value)
                : addClientArtifact(
                    current,
                    activeClient.id,
                    artifactKind,
                    value,
                  ),
            )
            setArtifactKind(null)
            setEditingArtifact(null)
          }}
        />
      ) : null}

      {productSolution ? (
        <ClientSolutionProductDialog
          solutionName={productSolution.name}
          products={availableProducts}
          onClose={() => setProductSolution(null)}
          onSave={attachProduct}
        />
      ) : null}

      {confirmOpen ? (
        <DialogFrame
          title="删除客户"
          overline="确认删除"
          onClose={() => setConfirmOpen(false)}
        >
          <form
            className="stack-form confirmation-form"
            onSubmit={confirmDelete}
          >
            <div>
              <p>
                「{activeClient.name}」及其联系人、项目、产品、方案和待办记录都会被移除，人脉档案里的资料不受影响。
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="button ghost"
                onClick={() => setConfirmOpen(false)}
              >
                取消
              </button>
              <button type="submit" className="button danger">
                删除
              </button>
            </footer>
          </form>
        </DialogFrame>
      ) : null}
    </main>
  )
}
