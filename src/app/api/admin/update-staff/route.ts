import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired']

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
      typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
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

    const supabase = createAdminClient()

    const { data: existingStaff, error: fetchStaffError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', staff_id)
      .single()

    if (fetchStaffError || !existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found.' },
        { status: 404 }
      )
    }

    const { error: updateStaffError } = await supabase
      .from('staff')
      .update({
        full_name,
        employee_code,
        company_name,
        phone,
        email,
        status,
        photo_url,
      })
      .eq('id', staff_id)

    if (updateStaffError) {
      return NextResponse.json(
        { error: updateStaffError.message },
        { status: 400 }
      )
    }

    const idStatus =
      status === 'active'
        ? 'active'
        : status === 'suspended'
        ? 'suspended'
        : status === 'revoked'
        ? 'revoked'
        : status === 'expired'
        ? 'expired'
        : 'inactive'

    const { error: updateIdsError } = await supabase
      .from('staff_ids')
      .update({ status: idStatus })
      .eq('staff_id', staff_id)
      .eq('is_current', true)

    if (updateIdsError) {
      return NextResponse.json(
        { error: updateIdsError.message },
        { status: 400 }
      )
    }

    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'update_staff',
        entity_type: 'staff',
        entity_id: staff_id,
        metadata: {
          full_name,
          employee_code,
          company_name,
          phone,
          email,
          status,
          photo_url,
          current_id_status: idStatus,
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