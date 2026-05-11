import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function buildChanges(
  beforeData: Record<string, any>,
  afterData: Record<string, any>
) {
  const changes = []

  for (const key of Object.keys(afterData)) {
    if (beforeData[key] !== afterData[key]) {
      changes.push({
        field: key,
        before: beforeData[key],
        after: afterData[key],
      })
    }
  }

  return changes
}

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

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('auth_user_id', currentUser.id)
      .single()

    if (
      !currentProfile ||
      !['super_admin', 'admin'].includes(currentProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Forbidden.' },
        { status: 403 }
      )
    }

    const { data: existing, error: fetchError } = await adminSupabase
      .from('profiles')
      .select('id, role, auth_user_id, full_name, email, is_active')
      .eq('id', profile_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      )
    }

    const updatePayload = {
      is_active,
    }

    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', profile_id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    const { error: auditError } = await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: currentProfile.id,
        action_type: 'toggle_user_status',
        entity_type: 'profile',
        entity_id: profile_id,
        metadata: {
          actor_name:
            currentProfile.full_name ||
            currentUser.email ||
            'Unknown user',

          actor_email:
            currentProfile.email ||
            currentUser.email ||
            null,

          actor_role: currentProfile.role,

          module: 'User Management',
          page: `/admin/users/${profile_id}`,

          updated_user_name: existing.full_name,
          updated_user_email: existing.email,
          updated_user_role: existing.role,

          auth_user_id: existing.auth_user_id,

          changes: buildChanges(existing, updatePayload),

          note: `User ${existing.full_name || existing.email} was ${
            is_active ? 'activated' : 'deactivated'
          }.`,
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