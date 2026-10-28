const COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl)a?\([0-9.,%\s/]+\))$/i

export function isSafeColor(value: string) {
  return COLOR_PATTERN.test(value.trim())
}

export function plainTextToHtml(value: string) {
  const container = document.createElement('div')
  const lines = value.split('\n')
  lines.forEach((line, index) => {
    if (index > 0) container.appendChild(document.createElement('br'))
    container.appendChild(document.createTextNode(line))
  })
  return container.innerHTML
}

export function htmlToPlainText(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  const parts: string[] = []

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as HTMLElement
    if (element.tagName === 'BR') {
      parts.push('\n')
      return
    }
    const isBlock = element.tagName === 'DIV' || element.tagName === 'P'
    if (isBlock && parts.length) parts.push('\n')
    element.childNodes.forEach(walk)
    if (isBlock) parts.push('\n')
  }

  template.content.childNodes.forEach(walk)
  return parts.join('').replace(/\n+$/, '').trimEnd()
}

function normalizedColor(element: HTMLElement) {
  const styleColor = element.style.color
  if (styleColor && isSafeColor(styleColor)) return styleColor
  const attributeColor = element.getAttribute('color')
  if (attributeColor && isSafeColor(attributeColor)) return attributeColor
  return ''
}

export function sanitizeDetailHtml(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  const output = document.createElement('div')

  const walk = (node: Node, target: HTMLElement) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent ?? ''))
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as HTMLElement
    const tag = element.tagName
    if (tag === 'BR') {
      target.appendChild(document.createElement('br'))
      return
    }
    if (tag === 'DIV' || tag === 'P') {
      if (target.childNodes.length) target.appendChild(document.createElement('br'))
      element.childNodes.forEach((child) => walk(child, target))
      return
    }
    if (tag === 'SPAN' || tag === 'FONT') {
      const color = normalizedColor(element)
      if (color) {
        const span = document.createElement('span')
        span.style.color = color
        element.childNodes.forEach((child) => walk(child, span))
        target.appendChild(span)
        return
      }
    }
    element.childNodes.forEach((child) => walk(child, target))
  }

  template.content.childNodes.forEach((node) => walk(node, output))
  return output.innerHTML
}
