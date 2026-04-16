import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired']

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

    const supabase = createAdminClient()

    // ✅ Update staff
    const { error: staffError } = await supabase
      .from('staff')
      .update({ status })
      .eq('id', staff_id)

    if (staffError) {
      return NextResponse.json(
        { error: staffError.message, step: 'update staff' },
        { status: 400 }
      )
    }

    // ✅ Map ID status
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

    // ✅ Fetch existing staff IDs
    const { data: currentIds, error: currentIdsError } = await supabase
      .from('staff_ids')
      .select('id, staff_id, is_current, status')
      .eq('staff_id', staff_id)

    if (currentIdsError) {
      return NextResponse.json(
        { error: currentIdsError.message, step: 'fetch staff_ids' },
        { status: 400 }
      )
    }

    // ✅ Update current ID status
    const { data: updatedIds, error: idError } = await supabase
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

    // ✅ Audit log
    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'update_staff_status',
        entity_type: 'staff',
        entity_id: staff_id,
        metadata: {
          status,
          id_status: idStatus,
          staff_ids_before: currentIds,
          staff_ids_updated: updatedIds,
        },
      },
    ])

    if (auditError) {
      return NextResponse.json(
        { error: auditError.message, step: 'insert audit log' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      idStatus,
      staffIdsBefore: currentIds,
      staffIdsUpdated: updatedIds,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update staff status.' },
      { status: 500 }
    )
  }
}