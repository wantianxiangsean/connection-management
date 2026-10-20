import {
  ArrowDown,
  ArrowUp,
  DatabaseBackup,
  Download,
  FileUp,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { DialogFrame } from '../components/DialogFrame'
import type {
  CustomFieldDefinition,
  CustomFieldType,
  ImportPreview,
} from '../domain/types'
import { buildImportPreview } from '../domain/import'
import {
  createPersonRecord,
  purgeExpiredPeople,
  restorePerson,
} from '../domain/workspace'
import { useWorkspace } from './WorkspaceContext'
import {
  createBackupArchive,
  downloadBlob,
  workspaceToCsv,
} from '../features/settings/exporters'

const fieldTypeLabels: Record<CustomFieldType, string> = {
  text: '短文本',
  long_text: '长文本',
  number: '数字',
  date: '日期',
  single_select: '单选',
  multi_select: '多选',
}

export function SettingsPage() {
  const { snapshot, update, repository } = useWorkspace()
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [duplicateChoices, setDuplicateChoices] = useState<
    Record<number, 'skip' | 'create' | 'merge'>
  >({})
  const [importMessage, setImportMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const deleted = snapshot.people.filter((person) => person.deletedAt)

  async function readCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const text = await readFileText(file)
    const result = buildImportPreview(text, snapshot.people)
    setPreview(result)
    setImportMessage('')
    setDuplicateChoices(
      Object.fromEntries(
        result.rows
          .filter((row) => row.duplicatePersonId)
          .map((row) => [row.rowNumber, 'skip']),
      ),
    )
  }

  function applyImport() {
    if (!preview) return
    let imported = 0
    update((current) => {
      let next = structuredClone(current)
      for (const row of preview.rows) {
        if (!row.fullName || !row.tier || row.errors.length) continue
        const duplicateChoice = row.duplicatePersonId
          ? duplicateChoices[row.rowNumber] ?? 'skip'
          : 'create'
        if (duplicateChoice === 'skip') continue

        const values = row.values
        const influenceText = values['影响力'] ?? values.influence ?? ''
        const intimacyText = values['亲密度'] ?? values.intimacy ?? ''
        const influence =
          influenceText === '强' || influenceText === 'strong'
            ? 'strong'
            : influenceText === '中' || influenceText === 'medium'
              ? 'medium'
              : influenceText === '弱' || influenceText === 'weak'
                ? 'weak'
                : null
        const intimacy =
          intimacyText === '密' || intimacyText === 'close'
            ? 'close'
            : intimacyText === '中' || intimacyText === 'medium'
              ? 'medium'
              : intimacyText === '疏' || intimacyText === 'distant'
                ? 'distant'
                : null

        if (duplicateChoice === 'merge' && row.duplicatePersonId) {
          next = {
            ...next,
            people: next.people.map((person) =>
              person.id === row.duplicatePersonId
                ? {
                    ...person,
                    role: values['角色'] || person.role,
                    occupation: values['职业'] || person.occupation,
                    region: values['地区'] || person.region,
                    industry: values['行业'] || person.industry,
                    notes: values['备注'] || person.notes,
                    influence: influence ?? person.influence,
                    intimacy: intimacy ?? person.intimacy,
                    updatedAt: new Date().toISOString(),
                  }
                : person,
            ),
          }
          imported += 1
          continue
        }

        next.people.push(
          createPersonRecord({
            kind: 'contact',
            tier: row.tier,
            fullName: row.fullName,
            role: values['角色'] ?? '',
            occupation: values['职业'] ?? '',
            region: values['地区'] ?? '',
            industry: values['行业'] ?? '',
            notes: values['备注'] ?? '',
            influence,
            intimacy,
            cadenceDays: values['联系周期天数']
              ? Number(values['联系周期天数'])
              : null,
          }),
        )
        imported += 1
      }
      return next
    })
    setImportMessage(`已导入 ${imported} 人`)
    setPreview(null)
  }

  async function exportBackup() {
    setExporting(true)
    try {
      const blob = await createBackupArchive(snapshot, repository)
      downloadBlob(
        blob,
        `见微-完整备份-${new Date().toISOString().slice(0, 10)}.zip`,
        'application/zip',
      )
    } finally {
      setExporting(false)
    }
  }

  function updateField(
    field: CustomFieldDefinition,
    patch: Partial<CustomFieldDefinition>,
  ) {
    update((current) => ({
      ...current,
      customFields: current.customFields.map((item) =>
        item.id === field.id ? { ...item, ...patch } : item,
      ),
    }))
  }

  function moveField(field: CustomFieldDefinition, direction: -1 | 1) {
    const ordered = [...snapshot.customFields].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    )
    const index = ordered.findIndex((item) => item.id === field.id)
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    update((current) => ({
      ...current,
      customFields: ordered.map((item, displayOrder) => ({
        ...item,
        displayOrder,
      })),
    }))
  }

  return (
    <main className="settings-page settings-wide">
      <header className="settings-heading">
        <p className="section-overline">档案柜设置</p>
        <h1>设置</h1>
        <p>调整归档表字段，备份你的资料，或恢复刚误删的人。</p>
      </header>

      <section className="settings-section" id="fields">
        <div className="settings-section-heading">
          <div>
            <h2>自定义维度</h2>
            <p>维度对所有联系人生效；停用不会删除已经填写的内容。</p>
          </div>
          <button
            type="button"
            className="button primary"
            onClick={() => setFieldDialogOpen(true)}
          >
            <Plus size={17} />
            新增维度
          </button>
        </div>
        <div className="field-list">
          {[...snapshot.customFields]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((field) => (
              <article key={field.id} className={!field.isActive ? 'inactive' : ''}>
                <div>
                  <strong>{field.label}</strong>
                  <span>{fieldTypeLabels[field.type]}</span>
                  {field.options.length ? (
                    <small>{field.options.join(' / ')}</small>
                  ) : null}
                </div>
                <div className="field-actions">
                  <button
                    type="button"
                    aria-label={`上移${field.label}`}
                    onClick={() => moveField(field, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移${field.label}`}
                    onClick={() => moveField(field, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      updateField(field, { isActive: !field.isActive })
                    }
                  >
                    {field.isActive ? '停用' : '恢复'}
                  </button>
                </div>
              </article>
            ))}
          {!snapshot.customFields.length ? (
            <p className="empty-copy">还没有自定义维度。</p>
          ) : null}
        </div>
      </section>

      <section className="settings-section" id="data">
        <div className="settings-section-heading">
          <div>
            <h2>导入与备份</h2>
            <p>CSV 用于通讯录迁移；完整备份包含结构化资料和可读取的附件。</p>
          </div>
        </div>
        <div className="data-actions">
          <label className="data-action-card">
            <FileUp size={21} />
            <strong>导入 CSV</strong>
            <span>支持姓名、关系与核心资料</span>
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="导入 CSV"
              onChange={readCsv}
            />
          </label>
          <button
            type="button"
            className="data-action-card"
            onClick={() =>
              downloadBlob(
                workspaceToCsv(snapshot),
                `见微-人脉-${new Date().toISOString().slice(0, 10)}.csv`,
                'text/csv;charset=utf-8',
              )
            }
          >
            <Download size={21} />
            <strong>导出 CSV</strong>
            <span>用于表格查看与迁移</span>
          </button>
          <button
            type="button"
            className="data-action-card"
            onClick={exportBackup}
            disabled={exporting}
          >
            <DatabaseBackup size={21} />
            <strong>{exporting ? '正在打包…' : '导出完整备份'}</strong>
            <span>JSON 资料与附件 ZIP</span>
          </button>
        </div>

        {preview ? (
          <div className="import-preview">
            <div className="import-preview-heading">
              <div>
                <strong>
                  {preview.rows.filter((row) => !row.errors.length).length}{' '}
                  行待导入
                </strong>
                <span>检查关系和重复姓名后再写入档案。</span>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={applyImport}
              >
                导入 {preview.rows.filter((row) => !row.errors.length).length} 人
              </button>
            </div>
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>行</th>
                    <th>姓名</th>
                    <th>关系</th>
                    <th>重复处理</th>
                    <th>检查</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>{row.fullName || '—'}</td>
                      <td>{row.tier ?? '—'}</td>
                      <td>
                        {row.duplicatePersonId ? (
                          <select
                            aria-label={`第 ${row.rowNumber} 行重复处理`}
                            value={duplicateChoices[row.rowNumber] ?? 'skip'}
                            onChange={(event) =>
                              setDuplicateChoices((current) => ({
                                ...current,
                                [row.rowNumber]: event.target.value as
                                  | 'skip'
                                  | 'create'
                                  | 'merge',
                              }))
                            }
                          >
                            <option value="skip">跳过</option>
                            <option value="create">仍然新增</option>
                            <option value="merge">合并到原档案</option>
                          </select>
                        ) : (
                          '新增'
                        )}
                      </td>
                      <td className={row.errors.length ? 'import-error' : ''}>
                        {row.errors.join('；') || '可以导入'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {importMessage ? (
          <p className="success-note" role="status">
            {importMessage}
          </p>
        ) : null}
      </section>

      <section className="settings-section" id="recycle">
        <div className="settings-section-heading">
          <div>
            <h2>回收站</h2>
            <p>人物和全部关联资料保留 30 天，恢复后会完整回到原关系层级。</p>
          </div>
          <button
            type="button"
            className="button ghost"
            onClick={() =>
              update((current) =>
                purgeExpiredPeople(
                  current,
                  new Date().toISOString().slice(0, 10),
                ),
              )
            }
          >
            <Trash2 size={16} />
            清理已过期
          </button>
        </div>
        {deleted.length ? (
          <div className="recycle-list">
            {deleted.map((person) => {
              const daysLeft = Math.max(
                0,
                30 -
                  Math.floor(
                    (Date.now() - new Date(person.deletedAt!).getTime()) /
                      86_400_000,
                  ),
              )
              return (
                <article key={person.id}>
                  <div>
                    <strong>{person.fullName}</strong>
                    <span>还可恢复 {daysLeft} 天</span>
                  </div>
                  <button
                    type="button"
                    className="button ghost"
                    aria-label={`恢复${person.fullName}`}
                    onClick={() =>
                      update((current) => restorePerson(current, person.id))
                    }
                  >
                    <RotateCcw size={15} />
                    恢复
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="empty-copy">回收站是空的。</p>
        )}
      </section>

      {fieldDialogOpen ? (
        <FieldDialog
          onClose={() => setFieldDialogOpen(false)}
          onSave={(field) => {
            update((current) => ({
              ...current,
              customFields: [
                ...current.customFields,
                {
                  id: `field-${crypto.randomUUID()}`,
                  label: field.label,
                  type: field.type,
                  options: field.options,
                  displayOrder: current.customFields.length,
                  isActive: true,
                },
              ],
            }))
            setFieldDialogOpen(false)
          }}
        />
      ) : null}
    </main>
  )
}

function readFileText(file: File) {
  if (typeof file.text === 'function') return file.text()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function FieldDialog({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (field: {
    label: string
    type: CustomFieldType
    options: string[]
  }) => void
}) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [options, setOptions] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!label.trim()) return
    onSave({
      label: label.trim(),
      type,
      options: options
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    })
  }

  return (
    <DialogFrame title="新增维度" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>
          <span>维度名称</span>
          <input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="例如：孩子学校"
            required
          />
        </label>
        <label>
          <span>字段类型</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as CustomFieldType)}
          >
            {(Object.keys(fieldTypeLabels) as CustomFieldType[]).map((item) => (
              <option key={item} value={item}>
                {fieldTypeLabels[item]}
              </option>
            ))}
          </select>
        </label>
        {type === 'single_select' || type === 'multi_select' ? (
          <label>
            <span>选项</span>
            <textarea
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              placeholder="每行一个选项"
              rows={5}
            />
          </label>
        ) : null}
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary">
            保存维度
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
