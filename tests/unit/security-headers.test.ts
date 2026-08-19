import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '@/lib/security-headers'

describe('buildContentSecurityPolicy', () => {
  it('never permits unsafe-eval in production', () => {
    const policy = buildContentSecurityPolicy(true)
    expect(policy).not.toContain("'unsafe-eval'")
    expect(policy).toContain('upgrade-insecure-requests')
  })

  it('allows the development compiler while preserving core restrictions', () => {
    const policy = buildContentSecurityPolicy(false)
    expect(policy).toContain("'unsafe-eval'")
    expect(policy).toContain("frame-ancestors 'none'")
  })
})
