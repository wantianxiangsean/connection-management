import { Search } from 'lucide-react'
import {
  useId,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { DialogFrame } from '../../components/DialogFrame'
import { matchesPersonName, sortBySurname } from '../../domain/alphabet'
import {
  contactAttitudeLabels,
  influenceLabels,
  tierLabels,
  type ContactAttitude,
  type ContactMethod,
  type Influence,
  type Person,
} from '../../domain/types'
import { ContactMethodEditor } from './ContactMethodEditor'

interface ContactDetails {
  title: string
  influence: Influence | null
  attitude: ContactAttitude
  note: string
  methods: ContactMethod[]
}

export function ClientContactDialog({
  people,
  error,
  onClose,
  onSave,
}: {
  people: Person[]
  error?: string
  onClose: () => void
  onSave: (
    target:
      | ({ personId: string } & ContactDetails)
      | ({ name: string } & ContactDetails),
    keepOpen: boolean,
  ) => boolean
}) {
  const candidates = useMemo(() => sortBySurname(people), [people])
  const [personId, setPersonId] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [newName, setNewName] = useState('')
  const [details, setDetails] = useState<ContactDetails>({
    title: '',
    influence: null,
    attitude: 'neutral',
    note: '',
    methods: [],
  })
  const listId = useId()
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) =>
        matchesPersonName(candidate.fullName, search),
      ),
    [candidates, search],
  )
  const selectedCandidate = candidates.find(
    (candidate) => candidate.id === personId,
  )
  const activeCandidate = filteredCandidates[activeIndex]

  function selectCandidate(candidate: Person) {
    setPersonId(candidate.id)
    setSearch('')
    setNewName('')
    setOpen(false)
    setDetails((current) => ({
      ...current,
      title: current.title || candidate.occupation,
      influence: current.influence ?? candidate.influence,
    }))
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) =>
        open
          ? Math.max(0, Math.min(current + 1, filteredCandidates.length - 1))
          : 0,
      )
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) =>
        open ? Math.max(current - 1, 0) : filteredCandidates.length - 1,
      )
      return
    }
    if (event.key === 'Enter' && open && activeCandidate) {
      event.preventDefault()
      selectCandidate(activeCandidate)
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  function reset() {
    setPersonId('')
    setSearch('')
    setOpen(false)
    setActiveIndex(0)
    setNewName('')
    setDetails({
      title: '',
      influence: null,
      attitude: 'neutral',
      note: '',
      methods: [],
    })
  }

  function persist(keepOpen: boolean) {
    const target = newName.trim()
      ? { name: newName.trim(), ...details }
      : personId
        ? { personId, ...details }
        : null
    if (!target) return
    const saved = onSave(target, keepOpen)
    if (keepOpen && saved) reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    persist(false)
  }

  return (
    <DialogFrame title="添加联系人" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>
          <span>从人脉档案选择</span>
          <div
            className="person-combobox"
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              ) {
                setOpen(false)
              }
            }}
          >
            <Search
              className="person-combobox-icon"
              size={16}
              aria-hidden="true"
            />
            <input
              className="person-combobox-input"
              role="combobox"
              aria-label="从人脉档案选择"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={
                open && activeCandidate
                  ? `${listId}-${activeIndex}`
                  : undefined
              }
              autoComplete="off"
              value={search || selectedCandidate?.fullName || ''}
              placeholder="输入姓名、姓名片段或拼音首字母"
              onFocus={(event) => {
                setOpen(true)
                if (selectedCandidate) event.currentTarget.select()
              }}
              onClick={() => setOpen(true)}
              onChange={(event) => {
                setSearch(event.target.value)
                setPersonId('')
                setNewName('')
                setActiveIndex(0)
                setOpen(true)
              }}
              onKeyDown={handleSearchKeyDown}
            />
            {open ? (
              <ul
                id={listId}
                className="person-combobox-list"
                role="listbox"
                aria-label="可选人脉"
              >
                {filteredCandidates.length ? (
                  filteredCandidates.map((candidate, index) => (
                    <li
                      id={`${listId}-${index}`}
                      key={candidate.id}
                      role="option"
                      aria-selected={candidate.id === personId}
                      className={
                        index === activeIndex ? 'is-active' : undefined
                      }
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectCandidate(candidate)}
                    >
                      <span>{candidate.fullName}</span>
                      <small>
                        {candidate.tier
                          ? tierLabels[candidate.tier]
                          : '人脉档案'}
                      </small>
                    </li>
                  ))
                ) : (
                  <li className="person-combobox-empty">
                    没有匹配的姓名，可直接填写下方的独立联系人。
                  </li>
                )}
              </ul>
            ) : null}
          </div>
          {selectedCandidate ? (
            <button
              type="button"
              className="text-button person-combobox-clear"
              onClick={() => {
                setPersonId('')
                setSearch('')
                setOpen(true)
              }}
            >
              清除选择
            </button>
          ) : null}
        </label>
        <p className="dialog-divider">或者，记下一个不在人脉表里的联系人</p>
        <label>
          <span>联系人姓名</span>
          <input
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value)
              if (event.target.value) {
                setPersonId('')
                setSearch('')
                setOpen(false)
              }
            }}
            placeholder="例如：王经理"
          />
          <small className="field-help">
            独立联系人只属于这个客户，不会出现在人脉档案里。
          </small>
        </label>
        <label>
          <span>职务</span>
          <input
            value={details.title}
            onChange={(event) =>
              setDetails((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="例如：采购总监"
          />
        </label>
        <div className="form-grid">
          <label>
            <span>影响力</span>
            <select
              value={details.influence ?? ''}
              onChange={(event) =>
                setDetails((current) => ({
                  ...current,
                  influence:
                    event.target.value === ''
                      ? null
                      : (event.target.value as Influence),
                }))
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
              value={details.attitude}
              onChange={(event) =>
                setDetails((current) => ({
                  ...current,
                  attitude: event.target.value as ContactAttitude,
                }))
              }
            >
              {(
                Object.keys(contactAttitudeLabels) as ContactAttitude[]
              ).map((item) => (
                <option key={item} value={item}>
                  {contactAttitudeLabels[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ContactMethodEditor
          value={details.methods}
          onChange={(methods) =>
            setDetails((current) => ({ ...current, methods }))
          }
        />
        <label>
          <span>备注</span>
          <textarea
            value={details.note}
            onChange={(event) =>
              setDetails((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            placeholder="决策习惯、关系背景或需要留意的事"
            rows={3}
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="button ghost"
            disabled={!personId && !newName.trim()}
            onClick={() => persist(true)}
          >
            保存并新增
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!personId && !newName.trim()}
          >
            保存
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
