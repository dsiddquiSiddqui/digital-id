import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const profile_id =
      typeof body.profile_id === 'string' ? body.profile_id.trim() : ''
    const is_active =
      typeof body.is_active === 'boolean' ? body.is_active : null

    if (!profile_id || is_active === null) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role, auth_user_id')
      .eq('id', profile_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active })
      .eq('id', profile_id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'toggle_user_status',
        entity_type: 'profile',
        entity_id: profile_id,
        metadata: {
          is_active,
          role: existing.role,
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
      message: 'User status updated successfully.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update user status.' },
      { status: 500 }
    )
  }
}