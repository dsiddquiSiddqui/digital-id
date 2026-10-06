import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildContentSecurityPolicy } from '@/lib/security-headers'

const PROTECTED_EXACT_PATHS = new Set([
  '/dashboard',
  '/alerts',
  '/expiry-alerts',
  '/billing',
  '/contact-sales',
  '/reports',
  '/notifications',
  '/document-renewals',
  '/imports',
  '/bulk-actions',
  '/id-card-designer',
  '/custom-domains',
  '/automations',
  '/enterprise-health',
  '/launch-checklist',
  '/email-templates',
  '/scheduled-jobs',
  '/permission-audit',
  '/production-readiness',
  '/security-center',
  '/onboarding-checklist',
  '/setup-wizard',
  '/help',
  '/audit-logs',
  '/profile',
  '/settings',
  '/users',
])

const PROTECTED_PREFIXES = [
  '/api/admin',
  '/api/platform',
  '/v2/staff',
  '/v2/staff-ids/',
  '/staff/',
  '/staff-ids/',
  '/users/',
  '/settings/',
]

function isProtectedPath(pathname: string) {
  return PROTECTED_EXACT_PATHS.has(pathname) || PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = request.headers.get('x-real-ip')?.trim()
  const cf = request.headers.get('cf-connecting-ip')?.trim()
  const value = forwarded || real || cf || ''
  return value.replace(/^\[|\]$/g, '').replace(/:\d+$/, '')
}

function ipv4ToNumber(ip: string) {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null
  return ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]
}

function matchesIpRule(ip: string, rule: string) {
  const cleanRule = rule.trim()
  if (!cleanRule) return false
  if (cleanRule === ip) return true
  if (!cleanRule.includes('/')) return false

  const [network, bitsText] = cleanRule.split('/')
  const bits = Number(bitsText)
  const ipNumber = ipv4ToNumber(ip)
  const networkNumber = ipv4ToNumber(network)
  if (ipNumber === null || networkNumber === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false

  const mask = bits === 0 ? 0 : 0xffffffff << (32 - bits)
  return (ipNumber & mask) === (networkNumber & mask)
}

function isAllowedIp(ip: string, allowlist: string[]) {
  if (allowlist.length === 0) return true
  if (process.env.NODE_ENV !== 'production' && ['127.0.0.1', '::1', 'localhost'].includes(ip)) return true
  return allowlist.some((rule) => matchesIpRule(ip, rule))
}

function forbiddenResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'This IP address is not allowed for this workspace.' }, { status: 403 })
  }
  return NextResponse.redirect(new URL('/forbidden?reason=ip_allowlist', request.url))
}

function mfaRequiredResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Two-factor authentication is required for this workspace.' }, { status: 403 })
  }
  const redirectUrl = new URL('/mfa', request.url)
  redirectUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(redirectUrl)
}

function sessionExpiredResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Session timeout reached. Please sign in again.' }, { status: 401 })
  }
  const redirectUrl = new URL('/session-expired', request.url)
  redirectUrl.searchParams.set('reason', 'session_timeout')
  return NextResponse.redirect(redirectUrl)
}

/** Applies tenant access controls and response security headers. */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  if (isProtectedPath(request.nextUrl.pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, organizations:organizations(ip_allowlist, require_2fa, mfa_enforcement_enabled, session_timeout_minutes, session_history_enabled)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    const organization = Array.isArray(profile?.organizations)
      ? profile?.organizations[0]
      : profile?.organizations
    const allowlist = Array.isArray(organization?.ip_allowlist)
      ? organization.ip_allowlist.filter((item: unknown) => typeof item === 'string')
      : []

    if (allowlist.length > 0 && !isAllowedIp(clientIp(request), allowlist)) {
      return forbiddenResponse(request)
    }

    const sessionTimeoutMinutes = Number(organization?.session_timeout_minutes || 0)
    if (organization?.session_history_enabled !== false && sessionTimeoutMinutes > 0 && profile?.id) {
      const { data: lastSession } = await supabase
        .from('session_activity')
        .select('last_seen_at')
        .eq('profile_id', profile.id)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const timeoutMs = sessionTimeoutMinutes * 60 * 1000
      if (lastSession?.last_seen_at && Date.now() - new Date(lastSession.last_seen_at).getTime() > timeoutMs) {
        return sessionExpiredResponse(request)
      }
    }

      if (
        request.nextUrl.pathname !== '/mfa' &&
        (organization?.require_2fa || organization?.mfa_enforcement_enabled)
      ) {
        const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel().catch(() => ({ data: null }))
        if (assurance?.currentLevel !== 'aal2') {
          return mfaRequiredResponse(request)
        }
      }
    }
  }

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
  response.headers.set(
    'Content-Security-Policy',
    buildContentSecurityPolicy(process.env.NODE_ENV === 'production')
  )

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
