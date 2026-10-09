import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requirePortalAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, full_name, email, role, is_active, platform_role, platform_permissions').eq('auth_user_id', user.id).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) return null
  const permissions = Array.isArray(profile.platform_permissions) ? profile.platform_permissions.filter((item): item is string => typeof item === 'string') : []
  return { ...profile, permissions, canManage: ['owner', 'administrator'].includes(profile.platform_role || 'administrator') }
}

export async function GET() {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const admin = createAdminClient()
    const [auditResult, taskResult, approvalResult] = await Promise.all([
      admin.from('audit_logs').select('id, organization_id, action_type, entity_type, entity_id, metadata, created_at, organization:organizations(id, name, slug), actor:profiles!audit_logs_actor_profile_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(250),
      admin.from('platform_support_tasks').select('id, organization_id, title, description, status, priority, assigned_to_profile_id, due_at, completed_at, created_at, updated_at, organization:organizations(id, name, slug), assignee:profiles!platform_support_tasks_assigned_to_profile_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(150),
      admin.from('platform_approval_requests').select('id, organization_id, action_type, entity_type, entity_id, request_payload, status, review_note, reviewed_at, expires_at, created_at, organization:organizations(id, name, slug), requester:profiles!platform_approval_requests_requested_by_profile_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(150),
    ])
    const error = auditResult.error || taskResult.error || approvalResult.error
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({
      auditEvents: auditResult.data || [], tasks: taskResult.data || [], approvals: approvalResult.data || [],
      access: { id: access.id, full_name: access.full_name, email: access.email, platform_role: access.platform_role, platform_permissions: access.permissions, canManageOperations: access.canManage },
    })
  } catch (error) {
    console.error('Portal operations load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePortalAccess()
    if (!access?.canManage) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
    const organizationId = typeof body.organization_id === 'string' ? body.organization_id : ''
    const priority = ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : 'normal'
    if (title.length < 3 || !organizationId) return NextResponse.json({ error: 'Organization and task title are required.' }, { status: 400 })
    const admin = createAdminClient()
    const { data: task, error } = await admin.from('platform_support_tasks').insert({ organization_id: organizationId, title, description: typeof body.description === 'string' ? body.description.trim().slice(0, 2000) || null : null, priority, due_at: typeof body.due_at === 'string' && body.due_at ? new Date(body.due_at).toISOString() : null, assigned_to_profile_id: typeof body.assigned_to_profile_id === 'string' && body.assigned_to_profile_id ? body.assigned_to_profile_id : null, created_by_profile_id: access.id }).select('id, organization_id, title, status, priority, due_at, created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await admin.from('audit_logs').insert({ organization_id: organizationId, actor_profile_id: access.id, action_type: 'portal_support_task_created', entity_type: 'platform_support_task', entity_id: task.id, metadata: { title, priority, actor_name: access.full_name, module: 'Tasks & Approvals', page: '/portal/tasks' } })
    return NextResponse.json({ task })
  } catch (error) {
    console.error('Portal task create error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requirePortalAccess()
    if (!access?.canManage) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const body = await request.json()
    if (body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Explicit confirmation is required.' }, { status: 400 })
    const admin = createAdminClient()
    if (body.kind === 'task') {
      const status = ['open', 'in_progress', 'blocked', 'completed', 'cancelled'].includes(body.status) ? body.status : ''
      if (!body.id || !status) return NextResponse.json({ error: 'Task and status are required.' }, { status: 400 })
      const update = { status, completed_at: status === 'completed' ? new Date().toISOString() : null }
      const { data, error } = await admin.from('platform_support_tasks').update(update).eq('id', body.id).select('id, organization_id, title, status').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await admin.from('audit_logs').insert({ organization_id: data.organization_id, actor_profile_id: access.id, action_type: 'portal_support_task_updated', entity_type: 'platform_support_task', entity_id: data.id, metadata: { status, actor_name: access.full_name, module: 'Tasks & Approvals', page: '/portal/tasks' } })
      return NextResponse.json({ task: data })
    }
    if (body.kind === 'approval') {
      const status = ['approved', 'rejected'].includes(body.status) ? body.status : ''
      const note = typeof body.review_note === 'string' ? body.review_note.trim().slice(0, 1000) : ''
      if (!body.id || !status || note.length < 3) return NextResponse.json({ error: 'Approval decision and review note are required.' }, { status: 400 })
      const { data, error } = await admin.from('platform_approval_requests').update({ status, review_note: note, reviewed_at: new Date().toISOString(), reviewed_by_profile_id: access.id }).eq('id', body.id).eq('status', 'pending').select('id, organization_id, action_type, status').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await admin.from('audit_logs').insert({ organization_id: data.organization_id, actor_profile_id: access.id, action_type: `portal_approval_${status}`, entity_type: 'platform_approval_request', entity_id: data.id, metadata: { action_type: data.action_type, review_note: note, actor_name: access.full_name, module: 'Tasks & Approvals', page: '/portal/tasks' } })
      return NextResponse.json({ approval: data })
    }
    return NextResponse.json({ error: 'Unsupported operation.' }, { status: 400 })
  } catch (error) {
    console.error('Portal operations update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
