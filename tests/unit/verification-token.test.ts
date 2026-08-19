import { describe, expect, it } from 'vitest'
import { isValidVerificationToken } from '@/lib/verification-token'

describe('isValidVerificationToken', () => {
  it('accepts generated hexadecimal and URL-safe tokens', () => {
    expect(isValidVerificationToken('a'.repeat(48))).toBe(true)
    expect(isValidVerificationToken('valid-token_value-1234567890')).toBe(true)
  })

  it('rejects short, oversized, and encoded attack strings', () => {
    expect(isValidVerificationToken('sample')).toBe(false)
    expect(isValidVerificationToken('a'.repeat(129))).toBe(false)
    expect(isValidVerificationToken("token' or '1'='1")).toBe(false)
  })
})
