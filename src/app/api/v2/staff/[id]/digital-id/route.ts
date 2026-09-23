import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized.', status: 401 as const, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile?.organization_id || !['super_admin', 'admin', 'manager'].includes(profile.role)) {
    return { error: 'Forbidden.', status: 403 as const, profile: null }
  }

  return { error: null, status: 200 as const, profile }
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

type PreviousId = {
  id: string
  is_current: boolean
  status: string
}

async function restorePreviousIds(
  adminSupabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  previousIds: PreviousId[]
) {
  await Promise.all(
    previousIds.map((previousId) =>
      adminSupabase
        .from('staff_ids')
        .update({
          is_current: previousId.is_current,
          status: previousId.status,
        })
        .eq('id', previousId.id)
        .eq('organization_id', organizationId)
    )
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('staff_ids')
      .select('*')
      .eq('staff_id', id)
      .eq('organization_id', access.profile!.organization_id)
      .eq('is_current', true)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      digital_id: data || null,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id: staffId } = await params
    const body = await request.json()
    const idNumber = typeof body.id_number === 'string' ? body.id_number.trim() : ''
    const roleTitle = typeof body.role_title === 'string' ? body.role_title.trim() : ''
    const siaNumber = typeof body.sia_number === 'string' && body.sia_number.trim()
      ? body.sia_number.trim()
      : null
    const issueDate = typeof body.issue_date === 'string' ? body.issue_date.trim() : ''
    const expiryDate = typeof body.expiry_date === 'string' ? body.expiry_date.trim() : ''

    if (!idNumber || !roleTitle || !issueDate || !expiryDate) {
      return NextResponse.json(
        { error: 'Complete all required Digital ID fields.' },
        { status: 400 }
      )
    }

    if (idNumber.length > 120 || roleTitle.length > 160 || (siaNumber?.length ?? 0) > 120) {
      return NextResponse.json(
        { error: 'One or more Digital ID fields are too long.' },
        { status: 400 }
      )
    }

    if (!isIsoDate(issueDate) || !isIsoDate(expiryDate) || expiryDate <= issueDate) {
      return NextResponse.json(
        { error: 'Expiry date must be later than the issue date.' },
        { status: 400 }
      )
    }

    const profile = access.profile!
    const organizationId = profile.organization_id!
    const adminSupabase = createAdminClient()

    const { data: staff, error: staffError } = await adminSupabase
      .from('staff')
      .select('id, full_name, employee_code')
      .eq('id', staffId)
      .eq('organization_id', organizationId)
      .single()

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const { data: duplicateId, error: duplicateError } = await adminSupabase
      .from('staff_ids')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id_number', idNumber)
      .maybeSingle()

    if (duplicateError) {
      return NextResponse.json({ error: duplicateError.message }, { status: 400 })
    }

    if (duplicateId) {
      return NextResponse.json(
        { error: 'This ID number is already in use. Enter a unique ID number.' },
        { status: 409 }
      )
    }

    const { data: previousIds, error: previousIdsError } = await adminSupabase
      .from('staff_ids')
      .select('id, is_current, status')
      .eq('staff_id', staffId)
      .eq('organization_id', organizationId)
      .eq('is_current', true)

    if (previousIdsError) {
      return NextResponse.json({ error: previousIdsError.message }, { status: 400 })
    }

    const { data: newId, error: insertError } = await adminSupabase
      .from('staff_ids')
      .insert({
        organization_id: organizationId,
        staff_id: staffId,
        id_number: idNumber,
        issue_date: issueDate,
        expiry_date: expiryDate,
        site_name: null,
        role_title: roleTitle,
        sia_number: siaNumber,
        qr_token: crypto.randomUUID(),
        watermark_text: 'Internal Digital ID',
        is_current: false,
        status: 'active',
        created_by: profile.id,
      })
      .select('id')
      .single()

    if (insertError || !newId) {
      const isDuplicate = insertError?.code === '23505'
      const message = isDuplicate
        ? 'This ID number is already in use. Enter a unique ID number.'
        : insertError?.message || 'Failed to create the Digital ID.'
      return NextResponse.json({ error: message }, { status: isDuplicate ? 409 : 400 })
    }

    const { error: revokeError } = await adminSupabase
      .from('staff_ids')
      .update({ is_current: false, status: 'revoked' })
      .eq('staff_id', staffId)
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .neq('id', newId.id)

    if (revokeError) {
      await adminSupabase
        .from('staff_ids')
        .delete()
        .eq('id', newId.id)
        .eq('organization_id', organizationId)
      return NextResponse.json({ error: revokeError.message }, { status: 400 })
    }

    const { error: activateError } = await adminSupabase
      .from('staff_ids')
      .update({ is_current: true })
      .eq('id', newId.id)
      .eq('organization_id', organizationId)

    if (activateError) {
      await restorePreviousIds(adminSupabase, organizationId, previousIds ?? [])
      await adminSupabase
        .from('staff_ids')
        .delete()
        .eq('id', newId.id)
        .eq('organization_id', organizationId)
      return NextResponse.json({ error: activateError.message }, { status: 400 })
    }

    const { error: auditError } = await adminSupabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_profile_id: profile.id,
      action_type: 'issue_staff_id',
      entity_type: 'staff_id',
      entity_id: newId.id,
      metadata: {
        actor_name: profile.full_name || profile.email || 'Unknown user',
        actor_email: profile.email || null,
        actor_role: profile.role,
        module: 'Digital ID Management',
        page: `/v2/staff/${staffId}/digital-id`,
        staff_id: staffId,
        staff_name: staff.full_name,
        employee_code: staff.employee_code,
        id_number: idNumber,
        role_title: roleTitle,
        sia_number: siaNumber,
        issue_date: issueDate,
        expiry_date: expiryDate,
        replaced_id_count: previousIds?.length ?? 0,
        note: `Digital ID issued for ${staff.full_name}.`,
      },
    })

    if (auditError) {
      await restorePreviousIds(adminSupabase, organizationId, previousIds ?? [])
      await adminSupabase
        .from('staff_ids')
        .delete()
        .eq('id', newId.id)
        .eq('organization_id', organizationId)
      return NextResponse.json(
        { error: 'The Digital ID could not be audited, so no changes were saved.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Digital ID issued successfully.',
      digital_id_id: newId.id,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to issue the Digital ID.' }, { status: 500 })
  }
}
