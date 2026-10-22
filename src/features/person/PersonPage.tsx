import {
  ArrowLeft,
  Briefcase,
  CakeSlice,
  FileText,
  HeartHandshake,
  MessageCircleMore,
  Pencil,
  Users,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  channelLabels,
  influenceLabels,
  intimacyLabels,
  tierLabels,
} from '../../domain/types'
import {
  addConnection,
  getPersonBundle,
  promoteReference,
  removeConnection,
} from '../../domain/workspace'
import { useWorkspace } from '../../app/WorkspaceContext'
import {
  BasicProfileDialog,
  CareerSummaryDialog,
  ConnectionDialog,
  DetailDialog,
  ImportantDateDialog,
  InteractionDialog,
  NotesDialog,
  SummaryDialog,
} from './ProfileDialogs'
import { ResolvedAttachmentLink } from '../../components/ResolvedAsset'

type DialogName =
  | 'basic'
  | 'detail'
  | 'connection'
  | 'family-summary'
  | 'career-summary'
  | 'date'
  | 'interaction'
  | 'notes'
  | null

export function PersonPage() {
  const { personId = '' } = useParams()
  const { snapshot, update, repository } = useWorkspace()
  const [dialog, setDialog] = useState<DialogName>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const bundle = getPersonBundle(snapshot, personId)

  if (!bundle) {
    return (
      <section className="not-found">
        <p className="section-overline">找不到这张档案</p>
        <h1>人物可能已被删除或移动</h1>
        <Link to="/" className="button primary">
          返回归档
        </Link>
      </section>
    )
  }

  const { person } = bundle

  function updatePerson(patch: Partial<typeof person>) {
    update((current) => ({
      ...current,
      people: current.people.map((item) =>
        item.id === person.id
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item,
      ),
    }))
    setDialog(null)
  }

  function openDialog(name: DialogName, recordId: string | null = null) {
    setEditingId(recordId)
    setDialog(name)
  }

  function closeDialog() {
    setDialog(null)
    setEditingId(null)
  }

  return (
    <main className="person-page" aria-label={`${person.fullName}的全息档案`}>
      <header className="person-topbar">
        <Link
          to={person.tier ? `/?tier=${person.tier}` : '/'}
          className="back-link"
        >
          <ArrowLeft size={17} />
          返回155人脉管理
        </Link>
        <div className="person-topbar-actions">
          <button
            type="button"
            className="button person-edit-button"
            aria-label="编辑基本资料"
            onClick={() => openDialog('basic')}
          >
            <Pencil size={16} />
            编辑基本资料
          </button>
        </div>
      </header>

      <div className="person-layout">
        <aside className={`identity-card tier-${person.tier ?? 'reference'}`}>
          <div className="identity-glow" aria-hidden="true" />
          <div className="identity-topline">
            <span className="tier-seal">
              {person.tier ? tierLabels[person.tier] : '引用'}
            </span>
          </div>
          <h1>{person.fullName}</h1>
          <p className="identity-role">{person.role || '还没写下角色'}</p>
          {person.industry ? (
            <p className="identity-industry">{person.industry}</p>
          ) : null}
          {person.school || person.major ? (
            <p className="identity-industry">
              {[person.school, person.major].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <p className="identity-occupation">
            {person.company || person.occupation
              ? [person.company, person.occupation].filter(Boolean).join(' · ')
              : '职务未记录'}
            {person.region ? ` · ${person.region}` : ''}
          </p>

          <dl className="identity-stats">
            <div>
              <dt>影响力</dt>
              <dd>{person.influence ? influenceLabels[person.influence] : '—'}</dd>
            </div>
            <div>
              <dt>亲密度</dt>
              <dd>{person.intimacy ? intimacyLabels[person.intimacy] : '—'}</dd>
            </div>
            <div>
              <dt>联系周期</dt>
              <dd>
                {person.cadenceDays ? `${person.cadenceDays} 天` : '未设置'}
              </dd>
            </div>
          </dl>

        </aside>

        <div className="dossier">
          <section className="dossier-section interaction-section">
            <SectionHeading
              icon={<MessageCircleMore size={19} />}
              title="互动记录"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('interaction')}
                >
                  新增
                </button>
              }
            />
            {bundle.interactions.length ? (
              <ul className="item-list interaction-list">
                {bundle.interactions.map((interaction) => {
                  const linkedDetail = interaction.detailEntryId
                    ? bundle.detailEntries.find(
                        (item) => item.id === interaction.detailEntryId,
                      )
                    : null
                  return (
                    <li key={interaction.id}>
                      <span className="list-initial">
                        {channelLabels[interaction.channel].slice(0, 1)}
                      </span>
                      <div>
                        <strong>
                          {interaction.occurredOn} ·{' '}
                          {channelLabels[interaction.channel]}
                        </strong>
                        <p>{interaction.summary}</p>
                        {linkedDetail ? (
                          <p className="interaction-detail-link">
                            关联细节 · {linkedDetail.category}：
                            {linkedDetail.content}
                          </p>
                        ) : null}
                        {bundle.attachments.some(
                          (attachment) =>
                            attachment.interactionId === interaction.id,
                        ) ? (
                          <div className="interaction-attachments">
                            {bundle.attachments
                              .filter(
                                (attachment) =>
                                  attachment.interactionId === interaction.id,
                              )
                              .map((attachment) => (
                                <ResolvedAttachmentLink
                                  key={attachment.id}
                                  attachment={attachment}
                                  repository={repository}
                                />
                              ))}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="row-edit-button"
                        aria-label={`编辑互动${interaction.occurredOn}`}
                        onClick={() => openDialog('interaction', interaction.id)}
                      >
                        编辑
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="empty-copy">
                还没有互动记录。见完面后，可以在这里快速记一笔。
              </p>
            )}
          </section>

          <section className="dossier-section timeline-section">
            <SectionHeading
              icon={<MessageCircleMore size={19} />}
              title="谈过的细节"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('detail')}
                >
                  新增
                </button>
              }
            />
            <div className="timeline">
              {bundle.detailEntries.map((detail) => {
                const linkedInteractions = bundle.interactions.filter(
                  (interaction) => interaction.detailEntryId === detail.id,
                )
                return (
                  <article key={detail.id}>
                    <div className="timeline-date">
                      <strong>{detail.observedOn.slice(5).replace('-', '.')}</strong>
                      <span>{detail.observedOn.slice(0, 4)}</span>
                    </div>
                    <div className="timeline-content">
                      <span className="detail-category">{detail.category}</span>
                      <p>{detail.content}</p>
                      {detail.followUpOn ? (
                        <small>回访提醒 · {detail.followUpOn}</small>
                      ) : null}
                      {linkedInteractions.length ? (
                        <ul className="detail-interaction-links">
                          {linkedInteractions.map((interaction) => (
                            <li key={interaction.id}>
                              <span>
                                {interaction.occurredOn} ·{' '}
                                {channelLabels[interaction.channel]}
                              </span>
                              {interaction.summary}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <button
                        type="button"
                        className="row-edit-button"
                        aria-label={`编辑细节${detail.category}`}
                        onClick={() => openDialog('detail', detail.id)}
                      >
                        编辑
                      </button>
                    </div>
                  </article>
                )
              })}
              {!bundle.detailEntries.length ? (
                <p className="empty-copy">
                  第一次记录，可以从今天聊天里最真实的一句话开始。
                </p>
              ) : null}
            </div>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<HeartHandshake size={19} />}
              title="家庭概况"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('family-summary')}
                >
                  编辑
                </button>
              }
            />
            <p className="section-copy notes-copy">
              {person.familySummary || '还没有记录家庭概况。'}
            </p>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<Briefcase size={19} />}
              title="职业概况"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('career-summary')}
                >
                  编辑
                </button>
              }
            />
            <div className="career-summary">
              {person.company || person.occupation ? (
                <p className="career-meta">
                  {[person.company, person.occupation].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              <p className="notes-copy">
                {person.careerSummary || '还没有记录职业概况。'}
              </p>
            </div>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<CakeSlice size={19} />}
              title="重要日期"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('date')}
                >
                  新增
                </button>
              }
            />
            {bundle.importantDates.length ? (
              <ul className="date-list date-list-wide">
                {bundle.importantDates.map((date) => (
                  <li key={date.id}>
                    <CakeSlice size={16} />
                    <div>
                      <strong>{date.label}</strong>
                      <span>
                        {date.calendarType === 'lunar' ? '农历' : '公历'}{' '}
                        {date.month}月{date.day}日
                        {date.repeatAnnually ? ' · 每年' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="row-edit-button"
                      aria-label={`编辑重要日期${date.label}`}
                      onClick={() => openDialog('date', date.id)}
                    >
                      编辑
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">还没有重要日期。</p>
            )}
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<HeartHandshake size={19} />}
              title="共同认识的人"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('connection')}
                >
                  新增
                </button>
              }
            />
            <div className="people-chips">
              {bundle.connections.map((connection) => (
                <span key={connection.id} className="connection-chip">
                  {connection.kind === 'contact' ? (
                    <Link to={`/people/${connection.id}`}>
                      {connection.fullName}
                    </Link>
                  ) : (
                    <>
                      <span>{connection.fullName}</span>
                      <small>引用</small>
                    </>
                  )}
                  {connection.kind === 'reference' ? (
                    <button
                      type="button"
                      className="connection-link-button"
                      onClick={() =>
                        update((current) =>
                          promoteReference(current, connection.id, 'friend'),
                        )
                      }
                    >
                      转为联系人
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="connection-remove-button"
                    aria-label={`删除与${connection.fullName}的共同认识关系`}
                    title="删除共同认识关系"
                    onClick={() =>
                      update((current) =>
                        removeConnection(current, person.id, connection.id),
                      )
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {!bundle.connections.length ? (
                <p className="empty-copy">还没有共同认识的人。</p>
              ) : null}
            </div>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<Users size={19} />}
              title="第一次认识 / 见面"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('basic')}
                >
                  编辑
                </button>
              }
            />
            {person.firstMetOn || person.firstMetPlace || person.firstMetStory ? (
              <div className="first-meeting-dossier">
                <strong>
                  {person.firstMetOn
                    ? format(
                        new Date(`${person.firstMetOn}T00:00:00`),
                        'yyyy年M月d日',
                      )
                    : '日期未记录'}
                  {person.firstMetPlace ? ` · ${person.firstMetPlace}` : ''}
                </strong>
                <p>{person.firstMetStory || '还没有写下当时的经过。'}</p>
              </div>
            ) : (
              <p className="empty-copy">还没有记录第一次认识或见面的经过。</p>
            )}
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<FileText size={19} />}
              title="备注"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('notes')}
                >
                  编辑
                </button>
              }
            />
            <p className="section-copy notes-copy">
              {person.notes || '还没有备注。'}
            </p>
          </section>
        </div>
      </div>

      {dialog === 'basic' ? (
        <BasicProfileDialog
          person={person}
          onClose={closeDialog}
          onSave={updatePerson}
          onDelete={() => {
            update((current) => ({
              ...current,
              people: current.people.map((item) =>
                item.id === person.id
                  ? { ...item, deletedAt: new Date().toISOString() }
                  : item,
              ),
            }))
            closeDialog()
          }}
        />
      ) : null}
      {dialog === 'detail' ? (
        <DetailDialog
          personId={person.id}
          initial={
            editingId
              ? bundle.detailEntries.find((item) => item.id === editingId)
              : undefined
          }
          onClose={closeDialog}
          onSave={(value, interactions) => {
            const timestamp = new Date().toISOString()
            const detailId = editingId ?? `detail-${crypto.randomUUID()}`
            update((current) => ({
              ...current,
              detailEntries: editingId
                ? current.detailEntries.map((item) =>
                    item.id === editingId
                      ? { ...item, ...value, updatedAt: timestamp }
                      : item,
                  )
                : [
                    ...current.detailEntries,
                    {
                      ...value,
                      id: detailId,
                      createdAt: timestamp,
                      updatedAt: timestamp,
                    },
                  ],
              interactions: [
                ...current.interactions,
                ...interactions.map((interaction) => ({
                  id: `interaction-${crypto.randomUUID()}`,
                  personId: person.id,
                  occurredOn: interaction.occurredOn,
                  channel: 'meeting' as const,
                  summary: interaction.summary,
                  detailEntryId: detailId,
                })),
              ],
            }))
            closeDialog()
          }}
          onDelete={() => {
            update((current) => ({
              ...current,
              detailEntries: current.detailEntries.filter(
                (item) => item.id !== editingId,
              ),
            }))
            closeDialog()
          }}
        />
      ) : null}
      {dialog === 'connection' ? (
        <ConnectionDialog
          person={person}
          people={snapshot.people}
          existingIds={bundle.connections.map((item) => item.id)}
          onClose={closeDialog}
          onSave={(target) => {
            update((current) => addConnection(current, person.id, target))
            closeDialog()
          }}
        />
      ) : null}
      {dialog === 'date' ? (
        <ImportantDateDialog
          initial={
            editingId
              ? bundle.importantDates.find((item) => item.id === editingId)
              : undefined
          }
          onClose={closeDialog}
          onSave={(value) => {
            update((current) => ({
              ...current,
              importantDates: editingId
                ? current.importantDates.map((item) =>
                    item.id === editingId ? { ...item, ...value } : item,
                  )
                : [
                    ...current.importantDates,
                    {
                      ...value,
                      id: `date-${crypto.randomUUID()}`,
                      personId: person.id,
                    },
                  ],
            }))
            closeDialog()
          }}
          onDelete={() => {
            update((current) => ({
              ...current,
              importantDates: current.importantDates.filter(
                (item) => item.id !== editingId,
              ),
            }))
            closeDialog()
          }}
        />
      ) : null}
      {dialog === 'interaction' ? (
        <InteractionDialog
          initial={
            editingId
              ? bundle.interactions.find((item) => item.id === editingId)
              : undefined
          }
          onClose={closeDialog}
          onSave={async (value, files) => {
            const interactionId =
              editingId ?? `interaction-${crypto.randomUUID()}`
            const uploaded = await Promise.all(
              files.map((file) =>
                repository.uploadAttachment(
                  file,
                  person.id,
                  null,
                  interactionId,
                ),
              ),
            )
            update((current) => ({
              ...current,
              interactions: editingId
                ? current.interactions.map((item) =>
                    item.id === editingId ? { ...item, ...value } : item,
                  )
                : [
                    ...current.interactions,
                    {
                      ...value,
                      id: interactionId,
                      personId: person.id,
                    },
                  ],
              attachments: [...current.attachments, ...uploaded],
            }))
            closeDialog()
          }}
          onDelete={() => {
            update((current) => ({
              ...current,
              interactions: current.interactions.filter(
                (item) => item.id !== editingId,
              ),
            }))
            closeDialog()
          }}
        />
      ) : null}
      {dialog === 'family-summary' ? (
        <SummaryDialog
          title="编辑家庭概况"
          label="家庭概况"
          initial={person.familySummary}
          placeholder="家庭成员、居住情况或最近近况"
          onClose={closeDialog}
          onSave={(familySummary) => updatePerson({ familySummary })}
        />
      ) : null}
      {dialog === 'career-summary' ? (
        <CareerSummaryDialog
          initialCompany={person.company ?? ''}
          initialOccupation={person.occupation}
          initialSummary={person.careerSummary}
          onClose={closeDialog}
          onSave={(value) => updatePerson(value)}
        />
      ) : null}
      {dialog === 'notes' ? (
        <NotesDialog
          initial={person.notes}
          onClose={closeDialog}
          onSave={(notes) => {
            updatePerson({ notes })
          }}
        />
      ) : null}
    </main>
  )
}

function SectionHeading({
  icon,
  title,
  actions,
}: {
  icon: ReactNode
  title: string
  actions?: ReactNode
}) {
  return (
    <div className="section-heading">
      <span>{icon}</span>
      <h2>{title}</h2>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  )
}
