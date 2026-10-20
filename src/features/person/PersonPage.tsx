import {
  ArrowLeft,
  CakeSlice,
  CalendarClock,
  Clock3,
  FileText,
  Glasses,
  HeartHandshake,
  ImagePlus,
  MessageCircleMore,
  Paperclip,
  Pencil,
  Plus,
  Target,
  Users,
} from 'lucide-react'
import { useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addDays, format } from 'date-fns'
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
} from '../../domain/workspace'
import { getCoachStatus } from '../../domain/coach'
import { getUpcomingDates } from '../../domain/dates'
import { useWorkspace } from '../../app/WorkspaceContext'
import {
  BasicProfileDialog,
  CareerDialog,
  ConnectionDialog,
  CustomValuesDialog,
  DetailDialog,
  FamilyDialog,
  GoalDialog,
  ImportantDateDialog,
  InteractionDialog,
} from './ProfileDialogs'
import {
  ResolvedAttachmentLink,
  ResolvedImage,
} from '../../components/ResolvedAsset'

type DialogName =
  | 'basic'
  | 'detail'
  | 'connection'
  | 'family'
  | 'career'
  | 'goal'
  | 'date'
  | 'interaction'
  | 'custom'
  | null

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function PersonPage() {
  const { personId = '' } = useParams()
  const { snapshot, update, repository } = useWorkspace()
  const [dialog, setDialog] = useState<DialogName>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
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
  const activeCustomFields = snapshot.customFields
    .filter((field) => field.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
  const today = format(new Date(), 'yyyy-MM-dd')
  const coach = getCoachStatus(
    person,
    bundle.interactions,
    bundle.importantDates,
    today,
    bundle.detailEntries,
    bundle.goals,
  )
  const upcomingDates = bundle.importantDates
    .flatMap((date) =>
      getUpcomingDates([date], today, 30).map((item) => ({ ...item, date })),
    )
    .slice(0, 3)

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

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('头像不能超过 10 MB。')
      return
    }
    setUploadError(null)
    try {
      const uploaded = await repository.uploadAttachment(file, person.id)
      updatePerson({ avatarUrl: uploaded.storagePath })
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : '头像上传失败')
    }
  }

  async function handleAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('附件不能超过 10 MB。')
      return
    }
    setUploadError(null)
    try {
      const uploaded = await repository.uploadAttachment(file, person.id)
      update((current) => ({
        ...current,
        attachments: [...current.attachments, uploaded],
      }))
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : '附件上传失败')
    }
  }

  return (
    <main className="person-page" aria-label={`${person.fullName}的全息档案`}>
      <Link to="/" className="back-link">
        <ArrowLeft size={17} />
        返回人脉归档
      </Link>

      <div className="person-layout">
        <aside className={`identity-card tier-${person.tier ?? 'reference'}`}>
          <div className="identity-glow" aria-hidden="true" />
          <div className="identity-topline">
            <span className="tier-seal">
              {person.tier ? tierLabels[person.tier] : '引用'}
            </span>
            <button
              type="button"
              className="icon-button light"
              aria-label="编辑基本资料"
              onClick={() => openDialog('basic')}
            >
              <Pencil size={16} />
            </button>
          </div>
          <div className="portrait">
            {person.avatarUrl ? (
              <ResolvedImage
                path={person.avatarUrl}
                alt={`${person.fullName}的头像`}
                repository={repository}
              />
            ) : (
              <span>{person.fullName.slice(0, 1)}</span>
            )}
          </div>
          <label className="avatar-upload">
            <ImagePlus size={14} />
            更换头像
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatar}
            />
          </label>
          <p className="identity-role">{person.role || '还没写下角色'}</p>
          <h1>{person.fullName}</h1>
          <p className="identity-occupation">
            {person.occupation || '职业未记录'}
            {person.region ? ` · ${person.region}` : ''}
          </p>
          {person.industry ? (
            <p className="identity-industry">{person.industry}</p>
          ) : null}

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

          <div className="first-meeting">
            <p className="section-overline">第一次见面</p>
            <strong>
              {person.firstMetOn
                ? format(
                    new Date(`${person.firstMetOn}T00:00:00`),
                    'yyyy年M月d日',
                  )
                : '尚未记录'}
            </strong>
            {person.firstMetPlace ? <span>{person.firstMetPlace}</span> : null}
            {person.firstMetStory ? <p>{person.firstMetStory}</p> : null}
          </div>

          <div className="identity-coach">
            <div>
              <Clock3 size={17} />
              <span>{coach.label}</span>
            </div>
            <p>{coach.reason}</p>
            <div className="identity-coach-actions">
              <button type="button" onClick={() => openDialog('interaction')}>
                记录互动
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePerson({
                    snoozedUntil: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
                  })
                }
              >
                稍后 7 天
              </button>
            </div>
          </div>
        </aside>

        <div className="dossier">
          <section className="dossier-section dossier-intro">
            <div>
              <p className="section-overline">见面前，先看这里</p>
              <h2>关系速写</h2>
              <p>
                {person.familySummary ||
                  '还没有写下家庭近况。可以从一句自然的观察开始。'}
              </p>
            </div>
            <div className="quick-facts">
              <article>
                <Target size={19} />
                <span>在意的目标</span>
                <strong>
                  {bundle.goals.find((goal) => goal.status === 'active')?.title ??
                    '尚未记录'}
                </strong>
              </article>
              <article>
                <CalendarClock size={19} />
                <span>最近互动</span>
                <strong>
                  {bundle.interactions[0]?.occurredOn
                    ? format(
                        new Date(`${bundle.interactions[0].occurredOn}T00:00:00`),
                        'M月d日',
                      )
                    : '还没有互动记录'}
                </strong>
              </article>
              <article>
                <CakeSlice size={19} />
                <span>即将到来的日期</span>
                <strong>
                  {upcomingDates[0]
                    ? `${upcomingDates[0].date.label} · ${upcomingDates[0].occurrence.date
                        .slice(5)
                        .replace('-', '/')}`
                    : '30 天内没有'}
                </strong>
              </article>
            </div>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<Users size={19} />}
              title="家庭与重要日期"
              actions={
                <>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openDialog('family')}
                  >
                    添加家庭成员
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openDialog('date')}
                  >
                    添加重要日期
                  </button>
                </>
              }
            />
            {person.familySummary ? (
              <p className="section-copy">{person.familySummary}</p>
            ) : null}
            <div className="split-lists">
              <div>
                <h3>家庭成员</h3>
                {bundle.familyMembers.length ? (
                  <ul className="item-list">
                    {bundle.familyMembers.map((member) => (
                      <li key={member.id}>
                        <span className="list-initial">
                          {member.name.slice(0, 1)}
                        </span>
                        <div>
                          <strong>
                            {member.name}
                            {member.relation ? ` · ${member.relation}` : ''}
                          </strong>
                          {member.note ? <p>{member.note}</p> : null}
                        </div>
                        <button
                          type="button"
                          className="row-edit-button"
                          aria-label={`编辑家庭成员${member.name}`}
                          onClick={() => openDialog('family', member.id)}
                        >
                          编辑
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-copy">还没有记录家庭成员。</p>
                )}
              </div>
              <div>
                <h3>重要日期</h3>
                {bundle.importantDates.length ? (
                  <ul className="date-list">
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
              </div>
            </div>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<Glasses size={19} />}
              title="职业与目标"
              actions={
                <>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openDialog('career')}
                  >
                    添加职业经历
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openDialog('goal')}
                  >
                    添加目标
                  </button>
                </>
              }
            />
            {person.careerSummary ? (
              <p className="section-copy">{person.careerSummary}</p>
            ) : null}
            <div className="career-stack">
              {bundle.careerEntries.map((entry) => (
                <article key={entry.id}>
                  <span>
                    {entry.startedOn?.slice(0, 4) ?? ''}
                    {entry.endedOn ? `—${entry.endedOn.slice(0, 4)}` : '—现在'}
                  </span>
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{entry.organization}</p>
                    {entry.note ? <small>{entry.note}</small> : null}
                  </div>
                  <button
                    type="button"
                    className="row-edit-button career-edit"
                    aria-label={`编辑职业经历${entry.title}`}
                    onClick={() => openDialog('career', entry.id)}
                  >
                    编辑
                  </button>
                </article>
              ))}
            </div>
            <div className="goal-strip">
              {bundle.goals.map((goal) => (
                <article key={goal.id}>
                  <span className="goal-status">
                    {goal.status === 'achieved'
                      ? '已实现'
                      : goal.status === 'paused'
                        ? '已暂停'
                        : '进行中'}
                  </span>
                  <strong>{goal.title}</strong>
                  {goal.details ? <p>{goal.details}</p> : null}
                  <button
                    type="button"
                    className="row-edit-button"
                    aria-label={`编辑目标${goal.title}`}
                    onClick={() => openDialog('goal', goal.id)}
                  >
                    编辑
                  </button>
                </article>
              ))}
            </div>
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
                  添加共同认识
                </button>
              }
            />
            <div className="people-chips">
              {bundle.connections.map((connection) =>
                connection.kind === 'contact' ? (
                  <Link key={connection.id} to={`/people/${connection.id}`}>
                    {connection.fullName}
                  </Link>
                ) : (
                  <span key={connection.id} className="reference-chip">
                    {connection.fullName}
                    <small>引用</small>
                    <button
                      type="button"
                      onClick={() =>
                        update((current) =>
                          promoteReference(current, connection.id, 'friend'),
                        )
                      }
                    >
                      转为联系人
                    </button>
                  </span>
                ),
              )}
              {!bundle.connections.length ? (
                <p className="empty-copy">还没有共同认识的人。</p>
              ) : null}
            </div>
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
                  添加细节
                </button>
              }
            />
            <div className="timeline">
              {bundle.detailEntries.map((detail) => (
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
              ))}
              {!bundle.detailEntries.length ? (
                <p className="empty-copy">
                  第一次记录，可以从今天聊天里最真实的一句话开始。
                </p>
              ) : null}
            </div>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<FileText size={19} />}
              title="补充维度"
              actions={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => openDialog('custom')}
                >
                  编辑补充资料
                </button>
              }
            />
            <dl className="custom-grid">
              {activeCustomFields.map((field) => {
                const value = bundle.customValues.find(
                  (item) => item.fieldId === field.id,
                )
                return (
                  <div key={field.id}>
                    <dt>{field.label}</dt>
                    <dd>
                      {Array.isArray(value?.value)
                        ? value.value.join('、')
                        : String(value?.value ?? '尚未填写')}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>

          <section className="dossier-section">
            <SectionHeading
              icon={<Paperclip size={19} />}
              title="附件与互动"
              actions={
                <>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openDialog('interaction')}
                  >
                    记录互动
                  </button>
                  <label className="file-action">
                    <Plus size={14} />
                    上传附件
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
                      onChange={handleAttachment}
                    />
                  </label>
                </>
              }
            />
            {bundle.interactions.length ? (
              <ul className="item-list interaction-list">
                {bundle.interactions.map((interaction) => (
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
                ))}
              </ul>
            ) : (
              <p className="empty-copy">还没有互动记录。</p>
            )}
            {bundle.attachments.length ? (
              <div className="attachment-grid">
                {bundle.attachments.map((attachment) => (
                  <ResolvedAttachmentLink
                    key={attachment.id}
                    attachment={attachment}
                    repository={repository}
                  />
                ))}
              </div>
            ) : null}
            {uploadError ? (
              <p className="form-error" role="alert">
                {uploadError}
              </p>
            ) : null}
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
          onSave={(value) => {
            const timestamp = new Date().toISOString()
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
                      id: `detail-${crypto.randomUUID()}`,
                      createdAt: timestamp,
                      updatedAt: timestamp,
                    },
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
      {dialog === 'family' ? (
        <FamilyDialog
          initial={
            editingId
              ? bundle.familyMembers.find((item) => item.id === editingId)
              : undefined
          }
          onClose={closeDialog}
          onSave={(value) => {
            update((current) => ({
              ...current,
              familyMembers: editingId
                ? current.familyMembers.map((item) =>
                    item.id === editingId ? { ...item, ...value } : item,
                  )
                : [
                    ...current.familyMembers,
                    {
                      ...value,
                      id: `family-${crypto.randomUUID()}`,
                      personId: person.id,
                    },
                  ],
            }))
            closeDialog()
          }}
          onDelete={() => {
            update((current) => ({
              ...current,
              familyMembers: current.familyMembers.filter(
                (item) => item.id !== editingId,
              ),
            }))
            closeDialog()
          }}
        />
      ) : null}
      {dialog === 'career' ? (
        <CareerDialog
          initial={
            editingId
              ? bundle.careerEntries.find((item) => item.id === editingId)
              : undefined
          }
          onClose={closeDialog}
          onSave={(value) => {
            update((current) => ({
              ...current,
              careerEntries: editingId
                ? current.careerEntries.map((item) =>
                    item.id === editingId ? { ...item, ...value } : item,
                  )
                : [
                    ...current.careerEntries,
                    {
                      ...value,
                      id: `career-${crypto.randomUUID()}`,
                      personId: person.id,
                    },
                  ],
            }))
            closeDialog()
          }}
          onDelete={() => {
            update((current) => ({
              ...current,
              careerEntries: current.careerEntries.filter(
                (item) => item.id !== editingId,
              ),
            }))
            closeDialog()
          }}
        />
      ) : null}
      {dialog === 'goal' ? (
        <GoalDialog
          initial={
            editingId
              ? bundle.goals.find((item) => item.id === editingId)
              : undefined
          }
          onClose={closeDialog}
          onSave={(value) => {
            update((current) => ({
              ...current,
              goals: editingId
                ? current.goals.map((item) =>
                    item.id === editingId ? { ...item, ...value } : item,
                  )
                : [
                    ...current.goals,
                    {
                      ...value,
                      id: `goal-${crypto.randomUUID()}`,
                      personId: person.id,
                    },
                  ],
            }))
            closeDialog()
          }}
          onDelete={() => {
            update((current) => ({
              ...current,
              goals: current.goals.filter((item) => item.id !== editingId),
            }))
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
          onSave={(value) => {
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
                      id: `interaction-${crypto.randomUUID()}`,
                      personId: person.id,
                    },
                  ],
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
      {dialog === 'custom' ? (
        <CustomValuesDialog
          personId={person.id}
          fields={activeCustomFields}
          values={bundle.customValues}
          onClose={closeDialog}
          onSave={(values) => {
            update((current) => ({
              ...current,
              customValues: [
                ...current.customValues.filter(
                  (item) => item.personId !== person.id,
                ),
                ...values,
              ],
            }))
            closeDialog()
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
