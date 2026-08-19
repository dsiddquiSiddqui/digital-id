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
    .select('id, role, full_name, email, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) {
    return null
  }

  return { user, profile }
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
      })
      .select('id, full_name, email, role, is_active, created_at')
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
