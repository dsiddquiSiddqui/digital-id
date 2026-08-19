import { describe, expect, it } from 'vitest'
import { sanitizeEmailTemplateHtml } from '@/lib/email-template-html'

describe('sanitizeEmailTemplateHtml', () => {
  it('removes executable markup and unsafe URLs', () => {
    const result = sanitizeEmailTemplateHtml(
      '<p onclick="alert(1)">Hello</p><script>alert(1)</script><a href="javascript:alert(1)">link</a>'
    )

    expect(result).toContain('<p>Hello</p>')
    expect(result).not.toContain('script')
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('javascript:')
  })

  it('keeps safe email formatting and template variables', () => {
    const result = sanitizeEmailTemplateHtml(
      '<p style="text-align:center">Hello <strong>{{staff_name}}</strong></p>'
    )

    expect(result).toContain('text-align:center')
    expect(result).toContain('{{staff_name}}')
  })
})
