import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  tierLabels,
  type RelationshipTier,
} from '../../domain/types'

interface PersonInput {
  fullName: string
  tier: RelationshipTier
  role: string
  occupation: string
  region: string
  industry: string
}

export function PersonDialog({
  open,
  initialTier,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialTier: RelationshipTier
  onClose: () => void
  onSubmit: (input: PersonInput) => void
}) {
  const [values, setValues] = useState<PersonInput>({
    fullName: '',
    tier: initialTier,
    role: '',
    occupation: '',
    region: '',
    industry: '',
  })

  if (!open) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.fullName.trim()) return
    onSubmit(values)
    setValues({
      fullName: '',
      tier: initialTier,
      role: '',
      occupation: '',
      region: '',
      industry: '',
    })
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="side-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-person-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="section-overline">新建档案</p>
            <h2 id="new-person-title">先记下他是谁</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={19} />
          </button>
        </header>
        <form onSubmit={submit} className="stack-form">
          <label>
            <span>姓名</span>
            <input
              autoFocus
              value={values.fullName}
              onChange={(event) =>
                setValues((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="怎么称呼他"
            />
          </label>
          <fieldset>
            <legend>关系层级</legend>
            <div className="segmented-options">
              {(Object.keys(tierLabels) as RelationshipTier[]).map((tier) => (
                <label key={tier}>
                  <input
                    type="radio"
                    name="tier"
                    checked={values.tier === tier}
                    onChange={() => setValues((current) => ({ ...current, tier }))}
                  />
                  <span>{tierLabels[tier]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-grid">
            <label>
              <span>角色</span>
              <input
                value={values.role}
                onChange={(event) =>
                  setValues((current) => ({ ...current, role: event.target.value }))
                }
                placeholder="老同事、导师…"
              />
            </label>
            <label>
              <span>职业</span>
              <input
                value={values.occupation}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    occupation: event.target.value,
                  }))
                }
                placeholder="产品负责人"
              />
            </label>
            <label>
              <span>地区</span>
              <input
                value={values.region}
                onChange={(event) =>
                  setValues((current) => ({ ...current, region: event.target.value }))
                }
                placeholder="上海"
              />
            </label>
            <label>
              <span>行业</span>
              <input
                value={values.industry}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    industry: event.target.value,
                  }))
                }
                placeholder="科技"
              />
            </label>
          </div>
          <footer>
            <button type="button" className="button ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button primary" disabled={!values.fullName.trim()}>
              建立档案
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

