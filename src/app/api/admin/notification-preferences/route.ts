import { NextResponse } from 'next/server'
import { actorMetadata, ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'

const preferenceKeys = ['document_expiry', 'document_renewals', 'security_alerts', 'billing_updates', 'workspace_activity'] as const
type PreferenceKey = (typeof preferenceKeys)[number]
type Preferences = Record<PreferenceKey, boolean>

const defaults: Preferences = {
  document_expiry: true,
  document_renewals: true,
  security_alerts: true,
  billing_updates: true,
  workspace_activity: true,
}

function normalize(value: unknown): Preferences {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return Object.fromEntries(preferenceKeys.map((key) => [key, source[key] !== false])) as Preferences
}

function jsonRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

async function loadPreferences(access: NonNullable<Awaited<ReturnType<typeof requireAdminAccess>>['access']>) {
  const organizationId = access.profile.organization_id!
  const primary = await access.adminSupabase
    .from('organizations')
    .select('notification_preferences')
    .eq('id', organizationId)
    .single()

  if (!primary.error) return normalize(primary.data?.notification_preferences || defaults)
  if (primary.error.code !== '42703') throw primary.error

  const fallback = await access.adminSupabase
    .from('organizations')
    .select('ui_polish_state')
    .eq('id', organizationId)
    .single()
  if (fallback.error) throw fallback.error

  return normalize(jsonRecord(fallback.data?.ui_polish_state).notification_preferences || defaults)
}

export async function GET() {
  const result = await requireAdminAccess(ADMIN_ROLES)
  if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })
  try {
    return NextResponse.json({ preferences: await loadPreferences(result.access) })
  } catch (error) {
    console.error('Notification preferences load error:', error)
    return NextResponse.json({ error: 'Unable to load notification preferences.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const result = await requireAdminAccess(ADMIN_ROLES)
  if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })
  const body = await request.json().catch(() => null)
  const preferences = normalize(body?.preferences)
  const organizationId = result.access.profile.organization_id!
  const primary = await result.access.adminSupabase.from('organizations').update({ notification_preferences: preferences }).eq('id', organizationId)
  if (primary.error?.code === '42703') {
    const current = await result.access.adminSupabase.from('organizations').select('ui_polish_state').eq('id', organizationId).single()
    if (current.error) return NextResponse.json({ error: 'Unable to save notification preferences.' }, { status: 400 })
    const uiPolishState = { ...jsonRecord(current.data?.ui_polish_state), notification_preferences: preferences }
    const fallback = await result.access.adminSupabase.from('organizations').update({ ui_polish_state: uiPolishState }).eq('id', organizationId)
    if (fallback.error) return NextResponse.json({ error: 'Unable to save notification preferences.' }, { status: 400 })
  } else if (primary.error) {
    return NextResponse.json({ error: 'Unable to save notification preferences.' }, { status: 400 })
  }
  await result.access.adminSupabase.from('audit_logs').insert({ organization_id: result.access.profile.organization_id!, actor_profile_id: result.access.profile.id, action_type: 'notification_preferences_updated', entity_type: 'organization', entity_id: result.access.profile.organization_id!, metadata: { ...actorMetadata(result.access), module: 'Settings', page: '/settings/notifications', preferences } })
  return NextResponse.json({ preferences })
}
