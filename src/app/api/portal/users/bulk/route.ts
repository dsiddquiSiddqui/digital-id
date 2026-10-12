import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const roles = ['administrator', 'support_agent', 'billing_agent', 'auditor']

export async function PATCH(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { data: actor } = await supabase.from('profiles').select('id, full_name, role, platform_role, is_active, organization_id').eq('auth_user_id', user.id).is('organization_id', null).single()
  if (!actor || actor.role !== 'super_admin' || actor.is_active === false || !['owner', 'administrator'].includes(actor.platform_role || 'administrator')) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const body = await request.json(); const ids = Array.isArray(body.profile_ids) ? [...new Set(body.profile_ids.map(String))].slice(0, 100) : []
  if (!ids.length || body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Select users and confirm the bulk operation.' }, { status: 400 })
  const admin = createAdminClient(); const { data: targets } = await admin.from('profiles').select('id, auth_user_id, platform_role, is_active, organization_id').in('id', ids).is('organization_id', null).eq('role', 'super_admin')
  if (!targets?.length || targets.some((target) => target.platform_role === 'owner')) return NextResponse.json({ error: 'Owners cannot be changed through bulk operations.' }, { status: 400 })
  let affected = 0
  if (body.action === 'revoke_sessions') { for (const target of targets) { if (target.auth_user_id) { const { data } = await admin.rpc('revoke_auth_sessions', { target_user_id: target.auth_user_id }); affected += Number(data || 0) } } }
  else {
    const update: Record<string, unknown> = {}
    if (body.action === 'enable') update.is_active = true
    if (body.action === 'disable') update.is_active = false
    if (body.action === 'role' && roles.includes(body.platform_role)) update.platform_role = body.platform_role
    if (!Object.keys(update).length) return NextResponse.json({ error: 'Unsupported bulk action.' }, { status: 400 })
    const { data, error } = await admin.from('profiles').update(update).in('id', targets.map((target) => target.id)).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 }); affected = data?.length || 0
  }
  await admin.from('audit_logs').insert({ actor_profile_id: actor.id, action_type: `portal_users_bulk_${body.action}`, entity_type: 'profile', metadata: { profile_ids: targets.map((target) => target.id), affected, actor_name: actor.full_name, module: 'Portal Users', page: '/portal/users' } })
  return NextResponse.json({ success: true, affected })
}
