import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired']

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const guard_id =
      typeof body.guard_id === 'string' ? body.guard_id.trim() : ''
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

    if (!guard_id || !full_name || !employee_code || !company_name || !email || !status) {
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

    const { data: existingGuard, error: fetchGuardError } = await supabase
      .from('guards')
      .select('id')
      .eq('id', guard_id)
      .single()

    if (fetchGuardError || !existingGuard) {
      return NextResponse.json(
        { error: 'Guard not found.' },
        { status: 404 }
      )
    }

    const { error: updateGuardError } = await supabase
      .from('guards')
      .update({
        full_name,
        employee_code,
        company_name,
        phone,
        email,
        status,
        photo_url,
      })
      .eq('id', guard_id)

    if (updateGuardError) {
      return NextResponse.json(
        { error: updateGuardError.message },
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
      .from('guard_ids')
      .update({ status: idStatus })
      .eq('guard_id', guard_id)
      .eq('is_current', true)

    if (updateIdsError) {
      return NextResponse.json(
        { error: updateIdsError.message },
        { status: 400 }
      )
    }

    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'update_guard',
        entity_type: 'guard',
        entity_id: guard_id,
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
      message: 'Guard updated successfully.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update guard.' },
      { status: 500 }
    )
  }
}