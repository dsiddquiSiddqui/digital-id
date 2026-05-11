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

    const staff_id =
      typeof body.staff_id === 'string' ? body.staff_id.trim() : ''

    const full_name =
      typeof body.full_name === 'string' ? body.full_name.trim() : ''

    const employee_code =
      typeof body.employee_code === 'string' ? body.employee_code.trim() : ''

    const company_name =
      typeof body.company_name === 'string' ? body.company_name.trim() : ''

    const phone =
      typeof body.phone === 'string' && body.phone.trim()
        ? body.phone.trim()
        : null

    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    const status =
      typeof body.status === 'string' ? body.status.trim() : ''

    const photo_url =
      typeof body.photo_url === 'string' && body.photo_url.trim()
        ? body.photo_url.trim()
        : null

    if (!staff_id || !full_name || !employee_code || !company_name || !email || !status) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
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

    const { data: existingStaff, error: fetchStaffError } = await adminSupabase
      .from('staff')
      .select('id, full_name, employee_code, company_name, phone, email, status, photo_url')
      .eq('id', staff_id)
      .single()

    if (fetchStaffError || !existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found.' },
        { status: 404 }
      )
    }

    const updatePayload = {
      full_name,
      employee_code,
      company_name,
      phone,
      email,
      status,
      photo_url,
    }

    const { error: updateStaffError } = await adminSupabase
      .from('staff')
      .update(updatePayload)
      .eq('id', staff_id)

    if (updateStaffError) {
      return NextResponse.json(
        { error: updateStaffError.message },
        { status: 400 }
      )
    }

    const idStatus = mapStaffStatusToIdStatus(status)

    const { data: currentIds, error: currentIdsError } = await adminSupabase
      .from('staff_ids')
      .select('id, staff_id, is_current, status')
      .eq('staff_id', staff_id)

    if (currentIdsError) {
      return NextResponse.json(
        { error: currentIdsError.message },
        { status: 400 }
      )
    }

    const currentActiveId = currentIds?.find((item) => item.is_current) || null

    const { data: updatedIds, error: updateIdsError } = await adminSupabase
      .from('staff_ids')
      .update({ status: idStatus })
      .eq('staff_id', staff_id)
      .eq('is_current', true)
      .select('id, staff_id, is_current, status')

    if (updateIdsError) {
      return NextResponse.json(
        { error: updateIdsError.message },
        { status: 400 }
      )
    }

    const updatedActiveId = updatedIds?.find((item) => item.is_current) || null

    const changes = [
      ...buildChanges(existingStaff, updatePayload),
      ...(currentActiveId?.status !== (updatedActiveId?.status || idStatus)
        ? [
            {
              field: 'staff_id.status',
              before: currentActiveId?.status || null,
              after: updatedActiveId?.status || idStatus,
            },
          ]
        : []),
    ]

    const { error: auditError } = await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: currentProfile.id,
        action_type: 'update_staff',
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
          staff_name: full_name,

          current_id_status: idStatus,

          changes,

          staff_ids_before: currentIds,
          staff_ids_updated: updatedIds,

          note: `Staff member ${full_name} was updated.`,
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
      message: 'Staff member updated successfully.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update staff member.' },
      { status: 500 }
    )
  }
}