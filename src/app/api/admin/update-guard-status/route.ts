import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired']

export async function POST(req: Request) {
  try {
    const { guard_id, status } = await req.json()

    if (!guard_id || !status) {
      return NextResponse.json(
        { error: 'Missing guard_id or status.' },
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

    const { error: guardError } = await supabase
      .from('guards')
      .update({ status })
      .eq('id', guard_id)

    if (guardError) {
      return NextResponse.json(
        { error: guardError.message, step: 'update guard' },
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

    const { data: currentIds, error: currentIdsError } = await supabase
      .from('guard_ids')
      .select('id, guard_id, is_current, status')
      .eq('guard_id', guard_id)

    if (currentIdsError) {
      return NextResponse.json(
        { error: currentIdsError.message, step: 'fetch guard_ids' },
        { status: 400 }
      )
    }

    const { data: updatedIds, error: idError } = await supabase
      .from('guard_ids')
      .update({ status: idStatus })
      .eq('guard_id', guard_id)
      .eq('is_current', true)
      .select('id, guard_id, is_current, status')

    if (idError) {
      return NextResponse.json(
        { error: idError.message, step: 'update guard_ids' },
        { status: 400 }
      )
    }

    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'update_guard_status',
        entity_type: 'guard',
        entity_id: guard_id,
        metadata: {
          status,
          id_status: idStatus,
          guard_ids_before: currentIds,
          guard_ids_updated: updatedIds,
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
      guardIdsBefore: currentIds,
      guardIdsUpdated: updatedIds,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update guard status.' },
      { status: 500 }
    )
  }
}