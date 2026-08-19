export function buildContentSecurityPolicy(isProduction: boolean) {
  const scriptPolicy = isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

  return [
    "default-src 'self'",
    scriptPolicy,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    isProduction ? 'upgrade-insecure-requests' : '',
  ].filter(Boolean).join('; ')
}
