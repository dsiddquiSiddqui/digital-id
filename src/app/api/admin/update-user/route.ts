import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['super_admin', 'admin', 'guard']

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const profile_id =
      typeof body.profile_id === 'string' ? body.profile_id.trim() : ''
    const full_name =
      typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone =
      typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
    const role =
      typeof body.role === 'string' ? body.role.trim() : ''
    const is_active =
      typeof body.is_active === 'boolean' ? body.is_active : null

    if (!profile_id || !full_name || !email || !role || is_active === null) {
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

    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id, auth_user_id')
      .eq('id', profile_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      )
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        full_name,
        email,
        phone,
        role,
        is_active,
      })
      .eq('id', profile_id)

    if (profileUpdateError) {
      return NextResponse.json(
        { error: profileUpdateError.message },
        { status: 400 }
      )
    }

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      existing.auth_user_id,
      { email }
    )

    if (authUpdateError) {
      return NextResponse.json(
        { error: authUpdateError.message },
        { status: 400 }
      )
    }

    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'update_user',
        entity_type: 'profile',
        entity_id: profile_id,
        metadata: {
          full_name,
          email,
          phone,
          role,
          is_active,
          auth_user_id: existing.auth_user_id,
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
      message: 'User updated successfully.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update user.' },
      { status: 500 }
    )
  }
}