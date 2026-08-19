import { createAdminClient } from '@/lib/supabase/admin'

const buckets = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(input: {
  key: string
  limit: number
  windowMs: number
  route: string
  organizationId?: string | null
  profileId?: string | null
}) {
  const now = Date.now()
  const current = buckets.get(input.key)

  if (!current || current.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return { allowed: true, remaining: input.limit - 1 }
  }

  current.count += 1

  if (current.count <= input.limit) {
    return { allowed: true, remaining: input.limit - current.count }
  }

  const supabase = createAdminClient()
  await supabase.from('rate_limit_events').insert({
    organization_id: input.organizationId || null,
    profile_id: input.profileId || null,
    route: input.route,
    identifier: input.key,
    event_count: current.count,
  })

  return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now }
}
