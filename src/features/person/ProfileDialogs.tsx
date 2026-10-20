import { useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { DialogFrame } from '../../components/DialogFrame'
import {
  channelLabels,
  tierLabels,
  type CalendarType,
  type CareerEntry,
  type CustomFieldDefinition,
  type CustomFieldValue,
  type DetailEntry,
  type FamilyMember,
  type Goal,
  type GoalStatus,
  type ImportantDate,
  type InteractionChannel,
  type Interaction,
  type Person,
  type RelationshipTier,
} from '../../domain/types'

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

export function BasicProfileDialog({
  person,
  onClose,
  onSave,
  onDelete,
}: {
  person: Person
  onClose: () => void
  onSave: (patch: Partial<Person>) => void
  onDelete: () => void
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      fullName: person.fullName,
      tier: person.tier ?? 'friend',
      role: person.role,
      occupation: person.occupation,
      region: person.region,
      industry: person.industry,
      influence: person.influence ?? '',
      intimacy: person.intimacy ?? '',
      cadenceDays: person.cadenceDays ?? '',
      familySummary: person.familySummary,
      careerSummary: person.careerSummary,
      firstMetOn: person.firstMetOn ?? '',
      firstMetPlace: person.firstMetPlace,
      firstMetStory: person.firstMetStory,
    },
  })

  return (
    <DialogFrame title="编辑基本资料" onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={handleSubmit((values) =>
          onSave({
            fullName: values.fullName.trim(),
            tier: values.tier,
            role: values.role,
            occupation: values.occupation,
            region: values.region,
            industry: values.industry,
            influence:
              values.influence === ''
                ? null
                : (values.influence as Person['influence']),
            intimacy:
              values.intimacy === ''
                ? null
                : (values.intimacy as Person['intimacy']),
            cadenceDays:
              values.cadenceDays === '' ? null : Number(values.cadenceDays),
            familySummary: values.familySummary,
            careerSummary: values.careerSummary,
            firstMetOn: values.firstMetOn || null,
            firstMetPlace: values.firstMetPlace,
            firstMetStory: values.firstMetStory,
          }),
        )}
      >
        <div className="form-grid">
          <label>
            <span>姓名</span>
            <input {...register('fullName')} required />
          </label>
          <label>
            <span>关系层级</span>
            <select {...register('tier')}>
              {(Object.keys(tierLabels) as RelationshipTier[]).map((tier) => (
                <option key={tier} value={tier}>
                  {tierLabels[tier]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>角色</span>
            <input {...register('role')} placeholder="老同事、导师…" />
          </label>
          <label>
            <span>职业</span>
            <input {...register('occupation')} />
          </label>
          <label>
            <span>地区</span>
            <input {...register('region')} />
          </label>
          <label>
            <span>行业</span>
            <input {...register('industry')} />
          </label>
          <label>
            <span>影响力</span>
            <select {...register('influence')}>
              <option value="">未设置</option>
              <option value="weak">弱</option>
              <option value="medium">中</option>
              <option value="strong">强</option>
            </select>
          </label>
          <label>
            <span>亲密度</span>
            <select {...register('intimacy')}>
              <option value="">未设置</option>
              <option value="distant">疏</option>
              <option value="medium">中</option>
              <option value="close">密</option>
            </select>
          </label>
        </div>
        <label>
          <span>手动联系周期（天）</span>
          <input
            {...register('cadenceDays')}
            type="number"
            min="1"
            placeholder="留空则不设节奏"
          />
          <small className="field-help">没有默认周期。只有你填写后才会出现到期提醒。</small>
        </label>
        <label>
          <span>家庭概况</span>
          <textarea {...register('familySummary')} rows={3} />
        </label>
        <label>
          <span>职业概况</span>
          <textarea {...register('careerSummary')} rows={3} />
        </label>
        <div className="form-grid">
          <label>
            <span>第一次见面日期</span>
            <input {...register('firstMetOn')} type="date" />
          </label>
          <label>
            <span>第一次见面地点</span>
            <input {...register('firstMetPlace')} />
          </label>
        </div>
        <label>
          <span>第一次见面的故事</span>
          <textarea {...register('firstMetStory')} rows={3} />
        </label>
        <footer>
          <button type="button" className="danger-text-button" onClick={onDelete}>
            删除联系人
          </button>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function DetailDialog({
  personId,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  personId: string
  initial?: DetailEntry
  onClose: () => void
  onSave: (value: {
    personId: string
    category: string
    content: string
    observedOn: string
    followUpOn: string | null
  }) => void
  onDelete?: () => void
}) {
  const [category, setCategory] = useState(initial?.category ?? '近况')
  const [content, setContent] = useState(initial?.content ?? '')
  const [observedOn, setObservedOn] = useState(
    initial?.observedOn ?? todayValue(),
  )
  const [followUpOn, setFollowUpOn] = useState(initial?.followUpOn ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!category.trim() || !content.trim()) return
    onSave({
      personId,
      category: category.trim(),
      content: content.trim(),
      observedOn,
      followUpOn: followUpOn || null,
    })
  }

  return (
    <DialogFrame title={initial ? '编辑细节' : '添加细节'} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>
          <span>类别</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            list="detail-category-hints"
            required
          />
          <datalist id="detail-category-hints">
            {['近况', '家庭', '饮食', 'App', '担忧', '开心体验', '身体情况', '心事'].map(
              (item) => (
                <option key={item} value={item} />
              ),
            )}
          </datalist>
        </label>
        <label>
          <span>内容</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={7}
            placeholder="写下一句具体、以后真的会用上的观察"
            required
          />
        </label>
        <div className="form-grid">
          <label>
            <span>发生日期</span>
            <input
              type="date"
              value={observedOn}
              onChange={(event) => setObservedOn(event.target.value)}
              required
            />
          </label>
          <label>
            <span>回访日期</span>
            <input
              type="date"
              value={followUpOn}
              onChange={(event) => setFollowUpOn(event.target.value)}
            />
          </label>
        </div>
        <footer>
          {initial && onDelete ? (
            <button type="button" className="danger-text-button" onClick={onDelete}>
              删除这条细节
            </button>
          ) : null}
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存细节
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function ConnectionDialog({
  person,
  people,
  existingIds,
  onClose,
  onSave,
}: {
  person: Person
  people: Person[]
  existingIds: string[]
  onClose: () => void
  onSave: (target: { existingPersonId: string } | { newName: string }) => void
}) {
  const candidates = people.filter(
    (item) => item.id !== person.id && !existingIds.includes(item.id),
  )
  const [existingPersonId, setExistingPersonId] = useState(candidates[0]?.id ?? '')
  const [newName, setNewName] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (newName.trim()) onSave({ newName: newName.trim() })
    else if (existingPersonId) onSave({ existingPersonId })
  }

  return (
    <DialogFrame title="添加共同认识" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>
          <span>选择档案中的人</span>
          <select
            value={existingPersonId}
            onChange={(event) => {
              setExistingPersonId(event.target.value)
              setNewName('')
            }}
          >
            <option value="">不选择</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.fullName}
                {candidate.kind === 'reference' ? '（引用人物）' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="dialog-divider">或者，记下一个还不在人脉表里的人</p>
        <label>
          <span>非人脉姓名</span>
          <input
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value)
              if (event.target.value) setExistingPersonId('')
            }}
            placeholder="例如：何叔叔"
          />
          <small className="field-help">
            创建后不会出现在归档表，只会作为共同认识的人被引用。
          </small>
        </label>
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary" disabled={!existingPersonId && !newName.trim()}>
            建立连接
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function FamilyDialog({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: FamilyMember
  onClose: () => void
  onSave: (value: { name: string; relation: string; birthday: string | null; note: string }) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [relation, setRelation] = useState(initial?.relation ?? '')
  const [birthday, setBirthday] = useState(initial?.birthday ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  return (
    <DialogFrame title={initial ? '编辑家庭成员' : '添加家庭成员'} onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          onSave({ name, relation, birthday: birthday || null, note })
        }}
      >
        <div className="form-grid">
          <label>
            <span>姓名或称呼</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            <span>关系</span>
            <input
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
              placeholder="女儿、伴侣、家里的猫…"
            />
          </label>
        </div>
        <label>
          <span>生日</span>
          <input
            type="date"
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
          />
        </label>
        <label>
          <span>近况</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
        </label>
        <footer>
          {initial && onDelete ? (
            <button type="button" className="danger-text-button" onClick={onDelete}>
              删除
            </button>
          ) : null}
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function CareerDialog({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: CareerEntry
  onClose: () => void
  onSave: (value: {
    organization: string
    title: string
    startedOn: string | null
    endedOn: string | null
    note: string
  }) => void
  onDelete?: () => void
}) {
  const [organization, setOrganization] = useState(initial?.organization ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [startedOn, setStartedOn] = useState(initial?.startedOn ?? '')
  const [endedOn, setEndedOn] = useState(initial?.endedOn ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  return (
    <DialogFrame title={initial ? '编辑职业经历' : '添加职业经历'} onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!organization.trim() && !title.trim()) return
          onSave({
            organization,
            title,
            startedOn: startedOn || null,
            endedOn: endedOn || null,
            note,
          })
        }}
      >
        <div className="form-grid">
          <label>
            <span>机构</span>
            <input value={organization} onChange={(event) => setOrganization(event.target.value)} />
          </label>
          <label>
            <span>职位</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>开始时间</span>
            <input type="date" value={startedOn} onChange={(event) => setStartedOn(event.target.value)} />
          </label>
          <label>
            <span>结束时间</span>
            <input type="date" value={endedOn} onChange={(event) => setEndedOn(event.target.value)} />
          </label>
        </div>
        <label>
          <span>补充说明</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
        </label>
        <footer>
          {initial && onDelete ? (
            <button type="button" className="danger-text-button" onClick={onDelete}>
              删除
            </button>
          ) : null}
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function GoalDialog({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Goal
  onClose: () => void
  onSave: (value: {
    title: string
    details: string
    status: GoalStatus
    targetDate: string | null
  }) => void
  onDelete?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [details, setDetails] = useState(initial?.details ?? '')
  const [status, setStatus] = useState<GoalStatus>(initial?.status ?? 'active')
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '')
  return (
    <DialogFrame title={initial ? '编辑目标' : '添加目标'} onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!title.trim()) return
          onSave({ title, details, status, targetDate: targetDate || null })
        }}
      >
        <label>
          <span>目标</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          <span>背景</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={4} />
        </label>
        <div className="form-grid">
          <label>
            <span>状态</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as GoalStatus)}>
              <option value="active">进行中</option>
              <option value="achieved">已实现</option>
              <option value="paused">暂停</option>
            </select>
          </label>
          <label>
            <span>目标日期</span>
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </label>
        </div>
        <footer>
          {initial && onDelete ? (
            <button type="button" className="danger-text-button" onClick={onDelete}>
              删除
            </button>
          ) : null}
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function ImportantDateDialog({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: ImportantDate
  onClose: () => void
  onSave: (value: {
    label: string
    calendarType: CalendarType
    month: number
    day: number
    year: number | null
    isLeapMonth: boolean
    repeatAnnually: boolean
    note: string
  }) => void
  onDelete?: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [calendarType, setCalendarType] = useState<CalendarType>(
    initial?.calendarType ?? 'gregorian',
  )
  const [month, setMonth] = useState(initial?.month ?? 1)
  const [day, setDay] = useState(initial?.day ?? 1)
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '')
  const [isLeapMonth, setIsLeapMonth] = useState(initial?.isLeapMonth ?? false)
  const [repeatAnnually, setRepeatAnnually] = useState(
    initial?.repeatAnnually ?? true,
  )
  const [note, setNote] = useState(initial?.note ?? '')
  return (
    <DialogFrame title={initial ? '编辑重要日期' : '添加重要日期'} onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!label.trim()) return
          onSave({
            label,
            calendarType,
            month,
            day,
            year: year ? Number(year) : null,
            isLeapMonth,
            repeatAnnually,
            note,
          })
        }}
      >
        <label>
          <span>日期名称</span>
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="生日、纪念日…" required />
        </label>
        <div className="form-grid">
          <label>
            <span>历法</span>
            <select value={calendarType} onChange={(event) => setCalendarType(event.target.value as CalendarType)}>
              <option value="gregorian">公历</option>
              <option value="lunar">农历</option>
            </select>
          </label>
          <label>
            <span>年份（可选）</span>
            <input type="number" value={year} onChange={(event) => setYear(event.target.value)} />
          </label>
          <label>
            <span>月份</span>
            <input type="number" min="1" max="12" value={month} onChange={(event) => setMonth(Number(event.target.value))} />
          </label>
          <label>
            <span>日期</span>
            <input type="number" min="1" max="31" value={day} onChange={(event) => setDay(Number(event.target.value))} />
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={repeatAnnually}
            onChange={(event) => setRepeatAnnually(event.target.checked)}
          />
          <span>每年重复</span>
        </label>
        {calendarType === 'lunar' ? (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isLeapMonth}
              onChange={(event) => setIsLeapMonth(event.target.checked)}
            />
            <span>闰月</span>
          </label>
        ) : null}
        <label>
          <span>备注</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </label>
        <footer>
          {initial && onDelete ? (
            <button type="button" className="danger-text-button" onClick={onDelete}>
              删除
            </button>
          ) : null}
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function InteractionDialog({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Interaction
  onClose: () => void
  onSave: (value: {
    occurredOn: string
    channel: InteractionChannel
    summary: string
  }, files: File[]) => void | Promise<void>
  onDelete?: () => void
}) {
  const [occurredOn, setOccurredOn] = useState(
    initial?.occurredOn ?? todayValue(),
  )
  const [channel, setChannel] = useState<InteractionChannel>(
    initial?.channel ?? 'meeting',
  )
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <DialogFrame title={initial ? '编辑互动' : '记录互动'} onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!summary.trim()) return
          setBusy(true)
          try {
            await onSave({ occurredOn, channel, summary }, files)
          } catch (cause) {
            setFileError(
              cause instanceof Error ? cause.message : '互动或附件保存失败',
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="form-grid">
          <label>
            <span>日期</span>
            <input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
          </label>
          <label>
            <span>方式</span>
            <select value={channel} onChange={(event) => setChannel(event.target.value as InteractionChannel)}>
              {(Object.keys(channelLabels) as InteractionChannel[]).map((item) => (
                <option key={item} value={item}>
                  {channelLabels[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>聊了什么</span>
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} required />
        </label>
        <label className="interaction-attachment-picker">
          <span>添加互动附件</span>
          <input
            type="file"
            multiple
            aria-label="添加互动附件"
            accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
            onChange={(event) => {
              const nextFiles = Array.from(event.target.files ?? [])
              event.target.value = ''
              const oversized = nextFiles.find(
                (file) => file.size > 10 * 1024 * 1024,
              )
              if (oversized) {
                setFileError(`${oversized.name} 超过 10 MB`)
                return
              }
              setFileError(null)
              setFiles((current) => [...current, ...nextFiles])
            }}
          />
          <small className="field-help">
            可添加照片、PDF、Office 文档或文本，单个文件不超过 10 MB。
          </small>
        </label>
        {files.length ? (
          <ul className="selected-file-list">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label={`移除附件${file.name}`}
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {fileError ? (
          <p className="form-error" role="alert">
            {fileError}
          </p>
        ) : null}
        <footer>
          {initial && onDelete ? (
            <button type="button" className="danger-text-button" onClick={onDelete}>
              删除
            </button>
          ) : null}
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? '正在保存…' : '保存互动'}
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function CustomValuesDialog({
  personId,
  fields,
  values,
  onClose,
  onSave,
}: {
  personId: string
  fields: CustomFieldDefinition[]
  values: CustomFieldValue[]
  onClose: () => void
  onSave: (values: CustomFieldValue[]) => void
}) {
  const [draft, setDraft] = useState<
    Record<string, string | number | string[]>
  >(
    Object.fromEntries(
      fields.map((field) => [
        field.id,
        values.find((item) => item.fieldId === field.id)?.value ?? '',
      ]),
    ),
  )
  return (
    <DialogFrame title="编辑补充资料" onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(
            fields.map((field) => ({
              id:
                values.find((item) => item.fieldId === field.id)?.id ??
                `custom-${crypto.randomUUID()}`,
              personId,
              fieldId: field.id,
              value: draft[field.id] ?? '',
            })),
          )
        }}
      >
        {fields.map((field) => (
          <label key={field.id}>
            <span>{field.label}</span>
            {field.type === 'long_text' ? (
              <textarea
                value={String(draft[field.id] ?? '')}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [field.id]: event.target.value }))
                }
                rows={3}
              />
            ) : field.type === 'single_select' ? (
              <select
                value={String(draft[field.id] ?? '')}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [field.id]: event.target.value }))
                }
              >
                <option value="">未填写</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'multi_select' ? (
              <select
                multiple
                value={Array.isArray(draft[field.id]) ? (draft[field.id] as string[]) : []}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [field.id]: Array.from(event.target.selectedOptions, (item) => item.value),
                  }))
                }
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={String(draft[field.id] ?? '')}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [field.id]: event.target.value }))
                }
              />
            )}
          </label>
        ))}
        {!fields.length ? <p className="empty-copy">还没有自定义维度，请先到设置中添加。</p> : null}
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}

export function NotesDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: string
  onClose: () => void
  onSave: (notes: string) => void
}) {
  const [notes, setNotes] = useState(initial)

  return (
    <DialogFrame title="编辑备注" onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(notes.trim())
        }}
      >
        <label>
          <span>备注内容</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={9}
            placeholder="写下暂时不适合归入其他区块的补充信息"
          />
        </label>
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存备注
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
