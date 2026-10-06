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

export async function GET() {
  const result = await requireAdminAccess(ADMIN_ROLES)
  if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })
  const { data, error } = await result.access.adminSupabase.from('organizations').select('notification_preferences').eq('id', result.access.profile.organization_id!).single()
  if (error) return NextResponse.json({ error: 'Unable to load notification preferences.' }, { status: 500 })
  return NextResponse.json({ preferences: normalize(data?.notification_preferences || defaults) })
}

export async function PATCH(request: Request) {
  const result = await requireAdminAccess(ADMIN_ROLES)
  if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })
  const body = await request.json().catch(() => null)
  const preferences = normalize(body?.preferences)
  const { error } = await result.access.adminSupabase.from('organizations').update({ notification_preferences: preferences }).eq('id', result.access.profile.organization_id!)
  if (error) return NextResponse.json({ error: 'Unable to save notification preferences.' }, { status: 400 })
  await result.access.adminSupabase.from('audit_logs').insert({ organization_id: result.access.profile.organization_id!, actor_profile_id: result.access.profile.id, action_type: 'notification_preferences_updated', entity_type: 'organization', entity_id: result.access.profile.organization_id!, metadata: { ...actorMetadata(result.access), module: 'Settings', page: '/settings/notifications', preferences } })
  return NextResponse.json({ preferences })
}
