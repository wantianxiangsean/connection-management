import { useEffect, useState, type FormEvent } from 'react'
import { DialogFrame } from '../../components/DialogFrame'
import {
  clientCategoryLabels,
  type Client,
  type ClientCategory,
} from '../../domain/types'

const allCategories = Object.keys(clientCategoryLabels) as ClientCategory[]

export function ClientDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: Client | null
  onClose: () => void
  onSave: (value: {
    name: string
    address: string
    categories: ClientCategory[]
  }) => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [selected, setSelected] = useState<ClientCategory[]>([])

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setAddress(initial?.address ?? '')
    setSelected(initial?.categories ?? [])
  }, [open, initial])

  if (!open) return null

  function toggleCategory(item: ClientCategory) {
    setSelected((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : allCategories.filter(
            (value) => value === item || current.includes(value),
          ),
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !selected.length) return
    onSave({ name: name.trim(), address: address.trim(), categories: selected })
  }

  return (
    <DialogFrame
      title={initial ? '编辑客户' : '新增客户'}
      overline={initial ? '客户资料' : '客户 / 伙伴'}
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={submit}>
        <label>
          <span>名称</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="公司或伙伴名称"
          />
        </label>
        <fieldset>
          <legend>身份（可多选）</legend>
          <div className="segmented-options">
            {allCategories.map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  name="client-categories"
                  checked={selected.includes(item)}
                  onChange={() => toggleCategory(item)}
                />
                <span>{clientCategoryLabels[item]}</span>
              </label>
            ))}
          </div>
          {selected.length ? null : (
            <small className="field-help field-help-error">
              至少选择一个身份
            </small>
          )}
        </fieldset>
        <label>
          <span>地址</span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="办公地址或常约见面的地方"
            rows={3}
          />
        </label>
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!name.trim() || !selected.length}
          >
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
