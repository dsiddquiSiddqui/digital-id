import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired']

function mapStaffStatusToIdStatus(status: string) {
  if (status === 'active') return 'active'
  if (status === 'suspended') return 'suspended'
  if (status === 'revoked') return 'revoked'
  if (status === 'expired') return 'expired'

  return 'inactive'
}

export async function POST(req: Request) {
  try {
    const { staff_id, status } = await req.json()

    if (!staff_id || !status) {
      return NextResponse.json(
        { error: 'Missing staff_id or status.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value.' },
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
      !['super_admin', 'admin', 'manager'].includes(currentProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Forbidden.' },
        { status: 403 }
      )
    }

    const { data: existingStaff, error: existingStaffError } =
      await adminSupabase
        .from('staff')
        .select('id, full_name, status')
        .eq('id', staff_id)
        .single()

    if (existingStaffError || !existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found.' },
        { status: 404 }
      )
    }

    const idStatus = mapStaffStatusToIdStatus(status)

    const { data: currentIds, error: currentIdsError } = await adminSupabase
      .from('staff_ids')
      .select('id, staff_id, is_current, status')
      .eq('staff_id', staff_id)

    if (currentIdsError) {
      return NextResponse.json(
        { error: currentIdsError.message, step: 'fetch staff_ids' },
        { status: 400 }
      )
    }

    const currentActiveId = currentIds?.find((item) => item.is_current) || null

    const { error: staffError } = await adminSupabase
      .from('staff')
      .update({ status })
      .eq('id', staff_id)

    if (staffError) {
      return NextResponse.json(
        { error: staffError.message, step: 'update staff' },
        { status: 400 }
      )
    }

    const { data: updatedIds, error: idError } = await adminSupabase
      .from('staff_ids')
      .update({ status: idStatus })
      .eq('staff_id', staff_id)
      .eq('is_current', true)
      .select('id, staff_id, is_current, status')

    if (idError) {
      return NextResponse.json(
        { error: idError.message, step: 'update staff_ids' },
        { status: 400 }
      )
    }

    const updatedActiveId = updatedIds?.find((item) => item.is_current) || null

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: currentProfile.id,
        action_type: 'update_staff_status',
        entity_type: 'staff',
        entity_id: staff_id,
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

          module: 'Staff Management',
          page: `/admin/staff/${staff_id}`,

          staff_id,
          staff_name: existingStaff.full_name,

          changes: [
            {
              field: 'staff.status',
              before: existingStaff.status,
              after: status,
            },
            {
              field: 'staff_id.status',
              before: currentActiveId?.status || null,
              after: updatedActiveId?.status || idStatus,
            },
          ],

          staff_ids_before: currentIds,
          staff_ids_updated: updatedIds,

          note: `Staff status updated for ${existingStaff.full_name}.`,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      idStatus,
      staffIdsBefore: currentIds,
      staffIdsUpdated: updatedIds,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update staff status.' },
      { status: 500 }
    )
  }
}