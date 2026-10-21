import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  DatabaseBackup,
  Download,
  FileUp,
  LogOut,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { DialogFrame } from '../components/DialogFrame'
import type {
  CustomFieldDefinition,
  CustomFieldType,
  ImportPreview,
} from '../domain/types'
import { buildImportPreview } from '../domain/import'
import {
  clearRecycleBin,
  createPersonRecord,
  removeCustomField,
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
  const { snapshot, update, repository, user } = useWorkspace()
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [duplicateChoices, setDuplicateChoices] = useState<
    Record<number, 'skip' | 'create' | 'merge'>
  >({})
  const [importMessage, setImportMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [clearRecycleOpen, setClearRecycleOpen] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudMessage, setCloudMessage] = useState('')
  const [cloudRestoreOpen, setCloudRestoreOpen] = useState(false)
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

  async function signOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      await repository.signOut()
    } catch (cause) {
      setSignOutError(
        cause instanceof Error ? cause.message : '退出失败，请稍后重试',
      )
      setSigningOut(false)
    }
  }

  async function backupToCloud() {
    setCloudBusy(true)
    setCloudMessage('')
    try {
      await repository.save(snapshot)
      setCloudMessage('联系人资料已备份到私有云端。')
    } catch (cause) {
      setCloudMessage(
        cause instanceof Error ? cause.message : '云端备份失败，请稍后重试',
      )
    } finally {
      setCloudBusy(false)
    }
  }

  async function restoreFromCloud() {
    setCloudBusy(true)
    setCloudMessage('')
    try {
      const restored = await repository.load()
      update(() => restored)
      setCloudRestoreOpen(false)
      setCloudMessage('已从私有云端恢复联系人资料。')
    } catch (cause) {
      setCloudMessage(
        cause instanceof Error ? cause.message : '云端恢复失败，请稍后重试',
      )
    } finally {
      setCloudBusy(false)
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
        <Link to="/" className="back-link settings-back-link" aria-label="人脉">
          <ArrowLeft size={17} aria-hidden="true" />
          返回人脉
        </Link>
        <h1>设置</h1>
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
                  <button
                    type="button"
                    className="text-button field-delete-button"
                    aria-label={`删除${field.label}`}
                    onClick={() =>
                      update((current) => removeCustomField(current, field.id))
                    }
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    删除
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

      {repository.mode === 'github' ? (
        <section className="settings-section" id="cloud">
          <div className="settings-section-heading">
            <div>
              <h2>云端备份</h2>
              <p>联系人资料保存在私有 GitHub 仓库；每次编辑会自动同步。</p>
            </div>
          </div>
          <div className="data-actions cloud-actions">
            <button
              type="button"
              className="data-action-card"
              disabled={cloudBusy}
              onClick={backupToCloud}
            >
              <DatabaseBackup size={21} />
              <strong>{cloudBusy ? '正在处理…' : '立即备份'}</strong>
              <span>把当前全部联系人写入私有云端</span>
            </button>
            <button
              type="button"
              className="data-action-card"
              disabled={cloudBusy}
              onClick={() => setCloudRestoreOpen(true)}
            >
              <Download size={21} />
              <strong>从云端恢复</strong>
              <span>用私有云端版本覆盖本机档案</span>
            </button>
          </div>
          {cloudMessage ? (
            <p className="success-note" role="status">
              {cloudMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="settings-section" id="recycle">
        <div className="settings-section-heading">
          <div>
            <h2>回收站</h2>
            <p>人物和全部关联资料保留 30 天，恢复后会完整回到原关系层级。</p>
          </div>
          <button
            type="button"
            className="button ghost"
            disabled={!deleted.length}
            onClick={() => setClearRecycleOpen(true)}
          >
            <Trash2 size={16} />
            清空回收站
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

      <section className="settings-section account-section" id="account">
        <div className="settings-section-heading">
          <div>
            <h2>账户</h2>
            <p>退出当前登录，不会删除已经保存的人脉资料。</p>
          </div>
          <button
            type="button"
            className="button ghost"
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut size={16} aria-hidden="true" />
            {signingOut ? '正在退出…' : '退出登录'}
          </button>
        </div>
        <div className="account-summary">
          <div>
            <span>当前账户</span>
            <strong>{user.phone || '本地预览'}</strong>
          </div>
          {signOutError ? (
            <p className="form-error" role="alert">
              {signOutError}
            </p>
          ) : null}
        </div>
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

      {clearRecycleOpen ? (
        <DialogFrame
          title="清空回收站"
          overline="永久删除"
          onClose={() => setClearRecycleOpen(false)}
        >
          <div className="stack-form confirmation-form">
            <div>
              <p>以下联系人及其全部关联资料将被永久删除，无法恢复：</p>
              <ul>
                {deleted.map((person) => (
                  <li key={person.id}>{person.fullName}</li>
                ))}
              </ul>
            </div>
            <footer>
              <button
                type="button"
                className="button ghost"
                onClick={() => setClearRecycleOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="button danger"
                onClick={() => {
                  update((current) => clearRecycleBin(current))
                  setClearRecycleOpen(false)
                }}
              >
                永久删除
              </button>
            </footer>
          </div>
        </DialogFrame>
      ) : null}

      {cloudRestoreOpen ? (
        <DialogFrame
          title="从云端恢复"
          overline="私有数据"
          onClose={() => setCloudRestoreOpen(false)}
        >
          <div className="stack-form confirmation-form">
            <div>
              <p>
                云端版本会覆盖当前浏览器中的联系人资料，但不会删除云端备份。
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="button ghost"
                onClick={() => setCloudRestoreOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="button primary"
                disabled={cloudBusy}
                onClick={restoreFromCloud}
              >
                确认恢复
              </button>
            </footer>
          </div>
        </DialogFrame>
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
