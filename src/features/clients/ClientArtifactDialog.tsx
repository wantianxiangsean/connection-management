import { useMemo, useState, type FormEvent } from 'react'
import { DialogFrame } from '../../components/DialogFrame'
import { RichTextEditor } from '../../components/RichTextEditor'
import {
  htmlToPlainText,
  plainTextToHtml,
  sanitizeDetailHtml,
} from '../../domain/rich-text'
import {
  clientArtifactLabels,
  type ClientArtifact,
  type ClientArtifactKind,
} from '../../domain/types'

export function ClientArtifactDialog({
  kind,
  initial,
  onClose,
  onSave,
}: {
  kind: ClientArtifactKind
  initial?: ClientArtifact | null
  onClose: () => void
  onSave: (value: {
    name: string
    note: string
    noteHtml: string
    industry: string
  }) => void
}) {
  const label = clientArtifactLabels[kind]
  const [name, setName] = useState(initial?.name ?? '')
  const [industry, setIndustry] = useState(initial?.industry ?? '')
  const initialHtml = useMemo(() => {
    const fromHtml = initial?.noteHtml
      ? sanitizeDetailHtml(initial.noteHtml)
      : ''
    if (fromHtml.trim()) return fromHtml
    return plainTextToHtml(initial?.note ?? '')
  }, [initial])
  const [noteHtml, setNoteHtml] = useState(initialHtml)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      note: htmlToPlainText(noteHtml).trim(),
      noteHtml: sanitizeDetailHtml(noteHtml),
      industry: kind === 'solution' ? industry.trim() : '',
    })
  }

  return (
    <DialogFrame
      title={initial ? `编辑${label}` : `新增${label}`}
      overline={initial ? '编辑资料' : '客户资料'}
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          <span>{label}名称</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`例如：${
              kind === 'project'
                ? '门店视觉升级'
                : kind === 'product'
                  ? '智能门锁 X2'
                  : '年度品牌合作方案'
            }`}
          />
        </label>
        {kind === 'solution' ? (
          <label>
            <span>行业</span>
            <input
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              placeholder="例如：智能硬件、家居"
            />
            <small className="field-help">
              多个行业用「、」分隔，搜索时可以按单个行业查到。
            </small>
          </label>
        ) : null}
        <div className="detail-content-field form-grow">
          <span>{label}说明</span>
          <RichTextEditor
            initialHtml={initialHtml}
            onChange={setNoteHtml}
            ariaLabel={`${label}说明`}
            placeholder="合作内容、进度或需要注意的事"
          />
        </div>
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!name.trim()}
          >
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
