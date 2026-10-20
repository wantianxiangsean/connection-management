import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  tierLabels,
  type Influence,
  type Intimacy,
  type RelationshipTier,
} from '../../domain/types'

interface PersonInput {
  fullName: string
  tier: RelationshipTier
  role: string
  occupation: string
  region: string
  industry: string
  influence: Influence | null
  intimacy: Intimacy | null
  influenceNote: string
  intimacyNote: string
  cadenceDays: number | null
  familySummary: string
  careerSummary: string
  firstMetOn: string | null
  firstMetPlace: string
  firstMetStory: string
}

type PersonDraft = Omit<PersonInput, 'tier'>

export function PersonDialog({
  open,
  initialTier,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialTier: RelationshipTier
  onClose: () => void
  onSubmit: (input: PersonInput, keepOpen: boolean) => void
}) {
  const [values, setValues] = useState<PersonDraft>({
    fullName: '',
    role: '',
    occupation: '',
    region: '',
    industry: '',
    influence: null,
    intimacy: null,
    influenceNote: '',
    intimacyNote: '',
    cadenceDays: null,
    familySummary: '',
    careerSummary: '',
    firstMetOn: null,
    firstMetPlace: '',
    firstMetStory: '',
  })
  const [manualTier, setManualTier] = useState<RelationshipTier | null>(null)

  if (!open) return null

  const effectiveTier = manualTier ?? initialTier

  function persist(keepOpen: boolean) {
    if (!values.fullName.trim()) return
    onSubmit({ ...values, tier: effectiveTier }, keepOpen)
    setValues({
      fullName: '',
      role: '',
      occupation: '',
      region: '',
      industry: '',
      influence: null,
      intimacy: null,
      influenceNote: '',
      intimacyNote: '',
      cadenceDays: null,
      familySummary: '',
      careerSummary: '',
      firstMetOn: null,
      firstMetPlace: '',
      firstMetStory: '',
    })
    setManualTier(null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    persist(false)
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
                    checked={effectiveTier === tier}
                    onChange={() => setManualTier(tier)}
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
            <label>
              <span>影响力</span>
              <select
                value={values.influence ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    influence:
                      event.target.value === ''
                        ? null
                        : (event.target.value as Influence),
                  }))
                }
              >
                <option value="">未设置</option>
                <option value="weak">弱</option>
                <option value="medium">中</option>
                <option value="strong">强</option>
              </select>
            </label>
            <label>
              <span>亲密度</span>
              <select
                value={values.intimacy ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    intimacy:
                      event.target.value === ''
                        ? null
                        : (event.target.value as Intimacy),
                  }))
                }
              >
                <option value="">未设置</option>
                <option value="distant">疏</option>
                <option value="medium">中</option>
                <option value="close">密</option>
              </select>
            </label>
            <label>
              <span>影响力备注</span>
              <input
                value={values.influenceNote}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    influenceNote: event.target.value,
                  }))
                }
                placeholder="为什么这样判断"
              />
            </label>
            <label>
              <span>亲密度备注</span>
              <input
                value={values.intimacyNote}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    intimacyNote: event.target.value,
                  }))
                }
                placeholder="相处的真实感受"
              />
            </label>
            <label>
              <span>联系周期（天）</span>
              <input
                type="number"
                min="1"
                value={values.cadenceDays ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    cadenceDays: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                placeholder="留空则不设节奏"
              />
            </label>
          </div>
          <label>
            <span>家庭概况</span>
            <textarea
              value={values.familySummary}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  familySummary: event.target.value,
                }))
              }
              placeholder="家庭成员、居住情况或最近近况"
              rows={3}
            />
          </label>
          <label>
            <span>职业概况</span>
            <textarea
              value={values.careerSummary}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  careerSummary: event.target.value,
                }))
              }
              placeholder="当前工作、事业方向或转型计划"
              rows={3}
            />
          </label>
          <div className="form-grid">
            <label>
              <span>第一次见面日期</span>
              <input
                type="date"
                value={values.firstMetOn ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    firstMetOn: event.target.value || null,
                  }))
                }
              />
            </label>
            <label>
              <span>第一次见面地点</span>
              <input
                value={values.firstMetPlace}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    firstMetPlace: event.target.value,
                  }))
                }
                placeholder="在哪里认识"
              />
            </label>
          </div>
          <label>
            <span>第一次见面的故事</span>
            <textarea
              value={values.firstMetStory}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  firstMetStory: event.target.value,
                }))
              }
              placeholder="当时是怎么认识、聊了什么"
              rows={3}
            />
          </label>
          <footer>
            <button type="button" className="button ghost" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={!values.fullName.trim()}
              onClick={() => persist(true)}
            >
              保存并新建
            </button>
            <button type="submit" className="button primary" disabled={!values.fullName.trim()}>
              保存
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
