import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired']

function mapIdStatusToStaffStatus(status: string) {
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

    const id =
      typeof body.id === 'string' ? body.id.trim() : ''

    const id_number =
      typeof body.id_number === 'string' ? body.id_number.trim() : ''

    const role_title =
      typeof body.role_title === 'string' ? body.role_title.trim() : ''

    const site_name =
      typeof body.site_name === 'string' && body.site_name.trim()
        ? body.site_name.trim()
        : null

    const sia_number =
      typeof body.sia_number === 'string' && body.sia_number.trim()
        ? body.sia_number.trim()
        : null

    const issue_date =
      typeof body.issue_date === 'string' ? body.issue_date.trim() : ''

    const expiry_date =
      typeof body.expiry_date === 'string' ? body.expiry_date.trim() : ''

    const status =
      typeof body.status === 'string' ? body.status.trim() : ''

    if (!id || !id_number || !role_title || !issue_date || !expiry_date || !status) {
      return NextResponse.json(
        {
          error: 'Missing required fields.',
          debug: {
            id,
            id_number,
            role_title,
            issue_date,
            expiry_date,
            status,
          },
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value.' },
        { status: 400 }
      )
    }

    if (expiry_date <= issue_date) {
      return NextResponse.json(
        { error: 'Expiry date must be later than issue date.' },
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

    const { data: existing, error: fetchError } = await adminSupabase
      .from('staff_ids')
      .select(`
        id,
        staff_id,
        id_number,
        role_title,
        site_name,
        sia_number,
        issue_date,
        expiry_date,
        status,
        is_current
      `)
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Digital ID record not found.' },
        { status: 404 }
      )
    }

    const { data: existingStaff, error: staffFetchError } = await adminSupabase
      .from('staff')
      .select('id, full_name, status')
      .eq('id', existing.staff_id)
      .single()

    if (staffFetchError || !existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found.' },
        { status: 404 }
      )
    }

    const updatePayload = {
      id_number,
      role_title,
      site_name,
      sia_number,
      issue_date,
      expiry_date,
      status,
    }

    const { error: updateIdError } = await adminSupabase
      .from('staff_ids')
      .update(updatePayload)
      .eq('id', id)

    if (updateIdError) {
      return NextResponse.json(
        { error: updateIdError.message },
        { status: 400 }
      )
    }

    const staffStatus = mapIdStatusToStaffStatus(status)

    const { error: updateStaffError } = await adminSupabase
      .from('staff')
      .update({ status: staffStatus })
      .eq('id', existing.staff_id)

    if (updateStaffError) {
      return NextResponse.json(
        { error: updateStaffError.message },
        { status: 400 }
      )
    }

    const digitalIdChanges = buildChanges(existing, updatePayload)

    const staffStatusChanged = existingStaff.status !== staffStatus

    const changes = [
      ...digitalIdChanges,
      ...(staffStatusChanged
        ? [
            {
              field: 'staff.status',
              before: existingStaff.status,
              after: staffStatus,
            },
          ]
        : []),
    ]

    const { error: auditError } = await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: currentProfile.id,
        action_type: 'update_staff_id',
        entity_type: 'staff_id',
        entity_id: id,
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

          module: 'Digital ID Management',
          page: `/admin/staff/${existing.staff_id}/ids`,

          staff_id: existing.staff_id,
          staff_name: existingStaff.full_name,

          id_number,
          role_title,
          site_name,
          sia_number,
          issue_date,
          expiry_date,
          status,
          staff_status: staffStatus,

          changes,

          note: `Digital ID updated for ${existingStaff.full_name}.`,
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
      message: 'Digital ID updated successfully.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update digital ID.' },
      { status: 500 }
    )
  }
}