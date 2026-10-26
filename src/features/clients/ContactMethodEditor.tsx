import { X } from 'lucide-react'
import {
  contactMethodLabels,
  type ContactMethod,
  type ContactMethodType,
} from '../../domain/types'

const methodTypes = Object.keys(contactMethodLabels) as ContactMethodType[]

const placeholders: Record<ContactMethodType, string> = {
  phone: '手机号或座机',
  email: '邮箱地址',
  wechat: '微信号',
  other: '其他联系方式',
}

export function ContactMethodEditor({
  value,
  onChange,
}: {
  value: ContactMethod[]
  onChange: (next: ContactMethod[]) => void
}) {
  function updateMethod(id: string, patch: Partial<ContactMethod>) {
    onChange(
      value.map((method) =>
        method.id === id ? { ...method, ...patch } : method,
      ),
    )
  }

  function addMethod() {
    onChange([
      ...value,
      {
        id: `method-${crypto.randomUUID()}`,
        type: 'phone',
        value: '',
      },
    ])
  }

  function removeMethod(id: string) {
    onChange(value.filter((method) => method.id !== id))
  }

  return (
    <div className="contact-method-editor">
      <div className="contact-method-editor-heading">
        <span>联系方式</span>
        <button
          type="button"
          className="text-button"
          onClick={addMethod}
        >
          + 添加
        </button>
      </div>
      {value.length ? (
        value.map((method) => (
          <div key={method.id} className="contact-method-row">
            <select
              aria-label="联系方式类型"
              value={method.type}
              onChange={(event) =>
                updateMethod(method.id, {
                  type: event.target.value as ContactMethodType,
                })
              }
            >
              {methodTypes.map((type) => (
                <option key={type} value={type}>
                  {contactMethodLabels[type]}
                </option>
              ))}
            </select>
            <input
              aria-label="联系方式内容"
              value={method.value}
              onChange={(event) =>
                updateMethod(method.id, { value: event.target.value })
              }
              placeholder={placeholders[method.type]}
            />
            <button
              type="button"
              className="icon-button contact-method-remove"
              aria-label="删除联系方式"
              onClick={() => removeMethod(method.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))
      ) : (
        <p className="contact-method-empty">还没有联系方式</p>
      )}
    </div>
  )
}
