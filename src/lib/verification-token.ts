const VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/

export function isValidVerificationToken(token: string) {
  return VERIFICATION_TOKEN_PATTERN.test(token)
}
