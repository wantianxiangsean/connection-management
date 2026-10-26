import { useState, type FormEvent } from 'react'
import { DialogFrame } from '../../components/DialogFrame'
import {
  contactAttitudeLabels,
  influenceLabels,
  type ClientContact,
  type ContactAttitude,
  type ContactMethod,
  type Influence,
} from '../../domain/types'
import { ContactMethodEditor } from './ContactMethodEditor'

export function ClientContactEditDialog({
  contact,
  linkedName,
  onClose,
  onSave,
}: {
  contact: ClientContact
  linkedName?: string
  onClose: () => void
  onSave: (value: {
    name?: string
    title: string
    influence: Influence | null
    attitude: ContactAttitude
    note: string
    methods: ContactMethod[]
  }) => void
}) {
  const [name, setName] = useState(contact.name)
  const [title, setTitle] = useState(contact.title)
  const [influence, setInfluence] = useState<Influence | ''>(
    contact.influence ?? '',
  )
  const [attitude, setAttitude] = useState<ContactAttitude>(contact.attitude)
  const [note, setNote] = useState(contact.note)
  const [methods, setMethods] = useState<ContactMethod[]>(contact.methods)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!linkedName && !name.trim()) return
    onSave({
      ...(linkedName ? {} : { name: name.trim() }),
      title: title.trim(),
      influence: influence === '' ? null : influence,
      attitude,
      note: note.trim(),
      methods,
    })
  }

  return (
    <DialogFrame title="编辑联系人" overline={linkedName ?? '独立联系人'} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        {linkedName ? (
          <div className="contact-linked-name">
            <span>姓名</span>
            <strong>{linkedName}</strong>
            <small>姓名跟随人脉档案，如需修改请到对应档案里编辑。</small>
          </div>
        ) : (
          <label>
            <span>姓名</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="联系人姓名"
            />
          </label>
        )}
        <label>
          <span>职务</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：采购总监"
          />
        </label>
        <div className="form-grid">
          <label>
            <span>影响力</span>
            <select
              value={influence}
              onChange={(event) =>
                setInfluence(event.target.value as Influence | '')
              }
            >
              <option value="">未设置</option>
              {(Object.keys(influenceLabels) as Influence[]).map((item) => (
                <option key={item} value={item}>
                  {influenceLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>态度</span>
            <select
              value={attitude}
              onChange={(event) =>
                setAttitude(event.target.value as ContactAttitude)
              }
            >
              {(Object.keys(contactAttitudeLabels) as ContactAttitude[]).map(
                (item) => (
                  <option key={item} value={item}>
                    {contactAttitudeLabels[item]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <ContactMethodEditor value={methods} onChange={setMethods} />
        <label>
          <span>备注</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="决策习惯、关系背景或需要留意的事"
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
            disabled={!linkedName && !name.trim()}
          >
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
