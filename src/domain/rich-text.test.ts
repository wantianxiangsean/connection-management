import { describe, expect, it } from 'vitest'
import {
  htmlToPlainText,
  isSafeColor,
  plainTextToHtml,
  sanitizeDetailHtml,
} from './rich-text'

describe('detail rich text', () => {
  it('keeps line breaks when converting plain text', () => {
    expect(plainTextToHtml('一\n二')).toBe('一<br>二')
  })

  it('extracts plain text with line breaks', () => {
    expect(htmlToPlainText('一<br>二')).toBe('一\n二')
  })

  it('keeps safe color spans and drops other markup', () => {
    const sanitized = sanitizeDetailHtml(
      '<span style="color: #E8481F" onclick="alert(1)">红</span>' +
        '<script>alert(2)</script><img src="x" onerror="alert(3)">',
    )

    expect(sanitized).toContain('<span')
    expect(sanitized).toContain('color')
    expect(sanitized).toContain('红')
    expect(sanitized).not.toContain('onclick')
    expect(sanitized).not.toContain('script')
    expect(sanitized).not.toContain('img')
  })

  it('rejects unsafe color values', () => {
    expect(isSafeColor('#E8481F')).toBe(true)
    expect(isSafeColor('rgb(1, 2, 3)')).toBe(true)
    expect(isSafeColor('url(javascript:alert(1))')).toBe(false)
    expect(isSafeColor('red; background:url(x)')).toBe(false)
  })
})
