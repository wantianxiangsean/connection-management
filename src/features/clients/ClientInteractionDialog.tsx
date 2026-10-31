import { format } from 'date-fns'
import { useMemo, useState, type FormEvent } from 'react'
import { DialogFrame } from '../../components/DialogFrame'
import { RichTextEditor } from '../../components/RichTextEditor'
import {
  htmlToPlainText,
  plainTextToHtml,
  sanitizeDetailHtml,
} from '../../domain/rich-text'
import {
  channelLabels,
  type ClientInteraction,
  type InteractionChannel,
} from '../../domain/types'

export function ClientInteractionDialog({
  initial,
  onClose,
  onSave,
}: {
  initial?: ClientInteraction | null
  onClose: () => void
  onSave: (value: {
    occurredOn: string
    channel: InteractionChannel
    summary: string
    summaryHtml: string
  }) => void
}) {
  const [occurredOn, setOccurredOn] = useState(
    initial?.occurredOn ?? format(new Date(), 'yyyy-MM-dd'),
  )
  const [channel, setChannel] = useState<InteractionChannel>(
    initial?.channel ?? 'meeting',
  )
  const initialHtml = useMemo(() => {
    const fromHtml = initial?.summaryHtml
      ? sanitizeDetailHtml(initial.summaryHtml)
      : ''
    if (fromHtml.trim()) return fromHtml
    return plainTextToHtml(initial?.summary ?? '')
  }, [initial])
  const [summaryHtml, setSummaryHtml] = useState(initialHtml)
  const summary = htmlToPlainText(summaryHtml).trim()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!summary) return
    onSave({
      occurredOn,
      channel,
      summary,
      summaryHtml: sanitizeDetailHtml(summaryHtml),
    })
  }

  return (
    <DialogFrame
      title={initial ? '编辑互动' : '记一次互动'}
      overline="互动记录"
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>日期</span>
            <input
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </label>
          <label>
            <span>方式</span>
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as InteractionChannel)
              }
            >
              {(Object.keys(channelLabels) as InteractionChannel[]).map(
                (item) => (
                  <option key={item} value={item}>
                    {channelLabels[item]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <div className="detail-content-field form-grow">
          <span>沟通内容</span>
          <RichTextEditor
            initialHtml={initialHtml}
            onChange={setSummaryHtml}
            ariaLabel="沟通内容"
            placeholder="聊了什么、对方关注什么、下一步是什么"
            autoFocus
          />
        </div>
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary" disabled={!summary}>
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
