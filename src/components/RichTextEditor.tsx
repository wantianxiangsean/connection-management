import { useEffect, useRef, useState } from 'react'
import { sanitizeDetailHtml } from '../domain/rich-text'

export const textColorOptions = [
  { label: '默认（去掉选中部分的颜色）', value: '' },
  { label: '黑', value: '#111111' },
  { label: '浅灰', value: '#bcc5c1' },
  { label: '红', value: '#E8481F' },
  { label: '橙', value: '#E8A020' },
  { label: '绿', value: '#2E7D32' },
  { label: '蓝', value: '#1B75BB' },
]

export function RichTextEditor({
  initialHtml,
  onChange,
  placeholder,
  ariaLabel,
  autoFocus = false,
  compact = false,
}: {
  initialHtml: string
  onChange: (html: string) => void
  placeholder: string
  ariaLabel: string
  autoFocus?: boolean
  compact?: boolean
}) {
  const [initial] = useState(initialHtml)
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const [colorBar, setColorBar] = useState<{
    top: number
    left: number
  } | null>(null)

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setColorBar(null)
        return
      }
      const range = selection.getRangeAt(0)
      if (!editorRef.current?.contains(range.commonAncestorContainer)) {
        setColorBar(null)
        return
      }
      savedRangeRef.current = range.cloneRange()
      let rect = { top: 80, left: 24, bottom: 100, width: 0 }
      try {
        const measured = range.getBoundingClientRect()
        if (measured) rect = measured
      } catch {
        // Older test environments do not implement range rectangles.
      }
      const origin = editorRef.current?.getBoundingClientRect()
      const originLeft = origin?.left ?? 0
      const originTop = origin?.top ?? 0
      const editorWidth = origin?.width ?? 340
      const left = Math.max(
        0,
        Math.min(rect.left - originLeft, editorWidth - 300),
      )
      const relativeTop = rect.top - originTop
      const top =
        relativeTop - 46 < 0
          ? rect.bottom - originTop + 8
          : relativeTop - 46
      setColorBar({ top, left })
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  function emitChange() {
    onChange(sanitizeDetailHtml(editorRef.current?.innerHTML ?? ''))
  }

  function applyColorToRange(range: Range, color: string) {
    const fragment = range.extractContents()
    const container = document.createElement('div')
    container.appendChild(fragment)
    container.querySelectorAll('span[style]').forEach((span) => {
      const element = span as HTMLElement
      if (!element.style.color) return
      const parent = span.parentNode
      if (!parent) return
      while (span.firstChild) parent.insertBefore(span.firstChild, span)
      parent.removeChild(span)
    })
    const wrapper = document.createElement('span')
    if (color) wrapper.style.color = color
    while (container.firstChild) wrapper.appendChild(container.firstChild)
    range.insertNode(wrapper)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      const next = document.createRange()
      next.selectNodeContents(wrapper)
      selection.addRange(next)
    }
  }

  function applyColor(color: string) {
    const selection = window.getSelection()
    const range =
      selection && !selection.isCollapsed && selection.rangeCount
        ? selection.getRangeAt(0)
        : savedRangeRef.current
    if (
      !range ||
      range.collapsed ||
      !editorRef.current?.contains(range.commonAncestorContainer)
    ) {
      return
    }
    let applied = false
    if (typeof document.execCommand === 'function') {
      try {
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
        document.execCommand('styleWithCSS', false, 'true')
        if (color) document.execCommand('foreColor', false, color)
        else document.execCommand('removeFormat', false, 'false')
        applied = true
      } catch {
        applied = false
      }
    }
    if (!applied) applyColorToRange(range, color)
    emitChange()
    editorRef.current?.focus()
    setColorBar(null)
  }

  return (
    <div className="detail-editor-wrap">
      <div
        ref={editorRef}
        className={`detail-content-editor rich-text-editor${compact ? ' is-compact' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={emitChange}
        dangerouslySetInnerHTML={{ __html: initial }}
      />
      {colorBar ? (
        <div
          className="detail-colorbar"
          role="toolbar"
          aria-label="文字颜色"
          style={{ top: colorBar.top, left: colorBar.left }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <span className="detail-colorbar-label">选中文字后点色块</span>
          {textColorOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`detail-swatch${option.value ? '' : ' is-none'}`}
              style={option.value ? { background: option.value } : undefined}
              title={option.label}
              aria-label={option.label}
              onClick={() => applyColor(option.value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
