import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requirePortalAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, is_active, platform_role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) {
    return null
  }

  if (!['owner', 'administrator'].includes(profile.platform_role || 'administrator')) return null
  return { user, profile }
}

const PLATFORM_ROLES = ['owner', 'administrator', 'support_agent', 'billing_agent', 'auditor']
const ACCESS_SCOPES = ['all_organizations', 'assigned_organizations', 'read_only']

function permissionsFor(role: string) {
  if (role === 'owner') return ['organizations.manage', 'portal_users.manage', 'support.manage', 'billing.manage', 'audit.read']
  if (role === 'administrator') return ['organizations.manage', 'portal_users.manage', 'support.manage', 'billing.read', 'audit.read']
  if (role === 'support_agent') return ['organizations.read', 'support.manage', 'audit.read']
  if (role === 'billing_agent') return ['organizations.read', 'billing.manage', 'support.read', 'audit.read']
  return ['organizations.read', 'support.read', 'billing.read', 'audit.read']
}

export async function POST(request: Request) {
  try {
    const access = await requirePortalAccess()

    if (!access) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await request.json()
    const fullName =
      typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const platformRole = PLATFORM_ROLES.includes(body.platform_role) ? body.platform_role : 'support_agent'
    const accessScope = ACCESS_SCOPES.includes(body.platform_access_scope) ? body.platform_access_scope : platformRole === 'auditor' ? 'read_only' : 'all_organizations'

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email, and password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'super_admin',
          portal_access: true,
        },
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Unable to create portal user.' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        organization_id: null,
        auth_user_id: authData.user.id,
        role: 'super_admin',
        full_name: fullName,
        email,
        is_active: true,
        platform_role: platformRole,
        platform_access_scope: accessScope,
        platform_permissions: permissionsFor(platformRole),
      })
      .select('id, full_name, email, role, is_active, platform_role, platform_access_scope, platform_permissions, portal_last_active_at, created_at')
      .single()

    if (profileError || !profile) {
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError?.message || 'Unable to create portal profile.' },
        { status: 400 }
      )
    }

    await adminSupabase.from('audit_logs').insert({
      actor_profile_id: access.profile.id,
      action_type: 'portal_user_created',
      entity_type: 'profile',
      entity_id: profile.id,
      metadata: {
        actor_name: access.profile.full_name || access.user.email || 'Portal admin',
        actor_email: access.profile.email || access.user.email || null,
        actor_role: access.profile.role,
        module: 'Portal Users',
        page: '/portal',
        created_user_email: email,
        platform_role: platformRole,
        access_scope: accessScope,
      },
    })

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('Portal user create error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const body = await request.json()
    const profileId = typeof body.profile_id === 'string' ? body.profile_id : ''
    if (!profileId || body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Profile and explicit confirmation are required.' }, { status: 400 })

    const adminSupabase = createAdminClient()
    const { data: target } = await adminSupabase.from('profiles').select('id, auth_user_id, full_name, email, is_active, platform_role').eq('id', profileId).is('organization_id', null).eq('role', 'super_admin').maybeSingle()
    if (!target) return NextResponse.json({ error: 'Portal user not found.' }, { status: 404 })

    const update: Record<string, unknown> = {}
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active
    if (typeof body.platform_role === 'string' && PLATFORM_ROLES.includes(body.platform_role)) {
      update.platform_role = body.platform_role
      update.platform_permissions = permissionsFor(body.platform_role)
    }
    if (typeof body.platform_access_scope === 'string' && ACCESS_SCOPES.includes(body.platform_access_scope)) update.platform_access_scope = body.platform_access_scope
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No supported changes supplied.' }, { status: 400 })

    const removingOwner = target.platform_role === 'owner' && (update.is_active === false || (update.platform_role && update.platform_role !== 'owner'))
    if (removingOwner) {
      const { count } = await adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).is('organization_id', null).eq('role', 'super_admin').eq('platform_role', 'owner').eq('is_active', true).neq('id', target.id)
      if (!count) return NextResponse.json({ error: 'Assign another active portal owner before changing this owner.' }, { status: 400 })
    }
    if (target.id === access.profile.id && update.is_active === false) return NextResponse.json({ error: 'You cannot suspend your own portal account.' }, { status: 400 })

    const { data: profile, error } = await adminSupabase.from('profiles').update(update).eq('id', target.id).select('id, full_name, email, role, is_active, platform_role, platform_access_scope, platform_permissions, portal_last_active_at, created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await adminSupabase.from('audit_logs').insert({ actor_profile_id: access.profile.id, action_type: 'portal_user_access_updated', entity_type: 'profile', entity_id: target.id, metadata: { previous: target, changes: update, actor_name: access.profile.full_name, module: 'Portal Users', page: '/portal' } })
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Portal user update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
