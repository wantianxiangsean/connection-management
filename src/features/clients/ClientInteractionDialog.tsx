import { format } from 'date-fns'
import { useState, type FormEvent } from 'react'
import { DialogFrame } from '../../components/DialogFrame'
import {
  channelLabels,
  type InteractionChannel,
} from '../../domain/types'

export function ClientInteractionDialog({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (value: {
    occurredOn: string
    channel: InteractionChannel
    summary: string
  }) => void
}) {
  const [occurredOn, setOccurredOn] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [channel, setChannel] = useState<InteractionChannel>('meeting')
  const [summary, setSummary] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!summary.trim()) return
    onSave({ occurredOn, channel, summary: summary.trim() })
  }

  return (
    <DialogFrame title="记一次互动" overline="互动记录" onClose={onClose}>
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
        <label>
          <span>沟通内容</span>
          <textarea
            autoFocus
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="聊了什么、对方关注什么、下一步是什么"
            rows={5}
          />
        </label>
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!summary.trim()}
          >
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
