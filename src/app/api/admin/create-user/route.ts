import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['super_admin', 'admin', 'guard']

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const full_name =
      typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone =
      typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
    const password =
      typeof body.password === 'string' ? body.password : ''
    const role =
      typeof body.role === 'string' ? body.role.trim() : ''

    if (!full_name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user.' },
        { status: 400 }
      )
    }

    const { data: insertedProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        auth_user_id: authData.user.id,
        full_name,
        email,
        phone,
        role,
        is_active: true,
      })
      .select()
      .single()

    if (profileError || !insertedProfile) {
      return NextResponse.json(
        {
          error: profileError?.message || 'Failed to create profile row.',
          auth_user_id: authData.user.id,
        },
        { status: 400 }
      )
    }

    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'create_user',
        entity_type: 'profile',
        entity_id: insertedProfile.id,
        metadata: {
          auth_user_id: authData.user.id,
          full_name,
          email,
          phone,
          role,
        },
      },
    ])

    if (auditError) {
      return NextResponse.json(
        { error: auditError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully.',
      profile: insertedProfile,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user.' },
      { status: 500 }
    )
  }
}