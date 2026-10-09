import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requirePortalAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name, email, is_active, platform_role, platform_permissions').eq('auth_user_id', user.id).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) return null
  const permissions = Array.isArray(profile.platform_permissions) ? profile.platform_permissions : []
  return { ...profile, canManage: ['owner', 'administrator'].includes(profile.platform_role || 'administrator'), permissions }
}

export async function GET() {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const admin = createAdminClient()
    const [sessions, rateLimits, notificationStates, settings, macros, schedules, comments] = await Promise.all([
      admin.from('session_activity').select('id, organization_id, profile_id, device_name, ip_address, user_agent, location_label, last_seen_at, created_at, organization:organizations(id, name), profile:profiles!session_activity_profile_id_fkey(full_name, email)').order('last_seen_at', { ascending: false }).limit(150),
      admin.from('rate_limit_events').select('id, organization_id, profile_id, route, identifier, event_count, window_started_at, created_at, organization:organizations(id, name)').order('created_at', { ascending: false }).limit(100),
      admin.from('platform_notification_states').select('item_key, read_at, acknowledged_at, owner_profile_id, updated_at').eq('profile_id', access.id),
      admin.from('platform_governance_settings').select('*').eq('id', 1).maybeSingle(),
      admin.from('platform_support_macros').select('id, title, body, visibility, is_active, created_at, updated_at').eq('is_active', true).order('title'),
      admin.from('platform_report_schedules').select('id, name, report_type, cadence, recipients, next_run_at, is_active, created_at, updated_at').order('created_at', { ascending: false }).limit(100),
      admin.from('platform_task_comments').select('id, task_id, message, created_at, author:profiles!platform_task_comments_author_profile_id_fkey(full_name, email)').order('created_at', { ascending: true }).limit(500),
    ])
    const error = sessions.error || rateLimits.error || notificationStates.error || settings.error || macros.error || schedules.error || comments.error
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ sessions: sessions.data || [], rateLimitEvents: rateLimits.data || [], notificationStates: notificationStates.data || [], governanceSettings: settings.data || null, supportMacros: macros.data || [], reportSchedules: schedules.data || [], taskComments: comments.data || [] })
  } catch (error) {
    console.error('Portal maturity load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const body = await request.json()
    const admin = createAdminClient()
    if (body.kind === 'notification_state') {
      const itemKey = typeof body.item_key === 'string' ? body.item_key.slice(0, 300) : ''
      if (!itemKey) return NextResponse.json({ error: 'Notification key is required.' }, { status: 400 })
      const update = { profile_id: access.id, item_key: itemKey, read_at: body.read ? new Date().toISOString() : null, acknowledged_at: body.acknowledged ? new Date().toISOString() : null, owner_profile_id: body.assign_to_me ? access.id : null, updated_at: new Date().toISOString() }
      const { data, error } = await admin.from('platform_notification_states').upsert(update).select('*').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ notificationState: data })
    }
    if (!access.canManage) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    if (body.kind === 'task_comment') {
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : ''
      if (!body.task_id || !message) return NextResponse.json({ error: 'Task and comment are required.' }, { status: 400 })
      const { data, error } = await admin.from('platform_task_comments').insert({ task_id: body.task_id, author_profile_id: access.id, message }).select('id, task_id, message, created_at').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ comment: data })
    }
    if (body.kind === 'support_macro') {
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
      const macroBody = typeof body.body === 'string' ? body.body.trim().slice(0, 4000) : ''
      if (!title || !macroBody) return NextResponse.json({ error: 'Template title and body are required.' }, { status: 400 })
      const { data, error } = await admin.from('platform_support_macros').insert({ title, body: macroBody, visibility: body.visibility === 'internal' ? 'internal' : 'customer', created_by_profile_id: access.id }).select('*').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ supportMacro: data })
    }
    if (body.kind === 'report_schedule') {
      const reportType = ['portfolio', 'billing', 'security', 'support', 'audit'].includes(body.report_type) ? body.report_type : ''
      const cadence = ['daily', 'weekly', 'monthly'].includes(body.cadence) ? body.cadence : ''
      const recipients = Array.isArray(body.recipients) ? body.recipients.filter((item: unknown): item is string => typeof item === 'string' && item.includes('@')).slice(0, 20) : []
      if (!body.name || !reportType || !cadence || !recipients.length) return NextResponse.json({ error: 'Name, report type, cadence, and recipients are required.' }, { status: 400 })
      const nextRun = new Date(); nextRun.setDate(nextRun.getDate() + (cadence === 'daily' ? 1 : cadence === 'weekly' ? 7 : 30))
      const { data, error } = await admin.from('platform_report_schedules').insert({ name: String(body.name).trim().slice(0, 120), report_type: reportType, cadence, recipients, next_run_at: nextRun.toISOString(), created_by_profile_id: access.id }).select('*').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ reportSchedule: data })
    }
    return NextResponse.json({ error: 'Unsupported operation.' }, { status: 400 })
  } catch (error) {
    console.error('Portal maturity create error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requirePortalAccess()
    if (!access?.canManage) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const body = await request.json()
    if (body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Explicit confirmation is required.' }, { status: 400 })
    const auditRetentionDays = Math.max(90, Math.min(3650, Number(body.audit_retention_days) || 2555))
    const firstResponse = Math.max(15, Math.min(10080, Number(body.support_first_response_minutes) || 240))
    const resolution = Math.max(60, Math.min(43200, Number(body.support_resolution_minutes) || 1440))
    const update = { approval_required_for: Array.isArray(body.approval_required_for) ? body.approval_required_for.slice(0, 30) : [], notification_policy: typeof body.notification_policy === 'object' && body.notification_policy ? body.notification_policy : {}, audit_retention_days: auditRetentionDays, support_first_response_minutes: firstResponse, support_resolution_minutes: resolution, updated_by_profile_id: access.id, updated_at: new Date().toISOString() }
    const admin = createAdminClient()
    const { data, error } = await admin.from('platform_governance_settings').update(update).eq('id', 1).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await admin.from('audit_logs').insert({ actor_profile_id: access.id, action_type: 'platform_governance_settings_updated', entity_type: 'platform_governance_settings', metadata: { changes: update, actor_name: access.full_name, module: 'Portal Settings', page: '/portal/settings' } })
    return NextResponse.json({ governanceSettings: data })
  } catch (error) {
    console.error('Portal maturity settings error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
