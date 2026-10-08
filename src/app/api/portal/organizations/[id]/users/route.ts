import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['admin', 'manager', 'hr_manager', 'hr', 'operation_manager', 'operation_team', 'guard']

async function requirePortalAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name, email, is_active').eq('auth_user_id', user.id).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) return null
  return profile
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const { id: organizationId } = await context.params
    const body = await request.json()
    const profileId = typeof body.profile_id === 'string' ? body.profile_id : ''
    const confirmation = typeof body.confirmation === 'string' ? body.confirmation : ''
    if (!profileId || confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Explicit confirmation is required.' }, { status: 400 })

    const update: { is_active?: boolean; role?: string } = {}
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active
    if (typeof body.role === 'string') {
      if (!ALLOWED_ROLES.includes(body.role)) return NextResponse.json({ error: 'Invalid organization role.' }, { status: 400 })
      update.role = body.role
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No supported change supplied.' }, { status: 400 })

    const adminSupabase = createAdminClient()
    const { data: previous } = await adminSupabase.from('profiles').select('id, full_name, email, role, is_active').eq('id', profileId).eq('organization_id', organizationId).neq('role', 'super_admin').maybeSingle()
    if (!previous) return NextResponse.json({ error: 'Organization user not found.' }, { status: 404 })

    const { data: profile, error } = await adminSupabase.from('profiles').update(update).eq('id', profileId).eq('organization_id', organizationId).select('id, full_name, email, phone, role, is_active, created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await adminSupabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_profile_id: access.id,
      action_type: 'portal_user_access_updated',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: { actor_name: access.full_name, actor_email: access.email, actor_role: access.role, previous, changes: update, module: 'Platform Portal', page: '/portal' },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Portal user control error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
