import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function DialogFrame({
  title,
  overline = '编辑档案',
  onClose,
  children,
}: {
  title: string
  overline?: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = `dialog-${title.replace(/\s+/g, '-')}`
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="side-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="section-overline">{overline}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

