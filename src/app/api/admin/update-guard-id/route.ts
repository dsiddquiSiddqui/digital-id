import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired']

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

    const supabase = createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('guard_ids')
      .select('id, guard_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Digital ID record not found.' },
        { status: 404 }
      )
    }

    const { error: updateIdError } = await supabase
      .from('guard_ids')
      .update({
        id_number,
        role_title,
        site_name,
        sia_number,
        issue_date,
        expiry_date,
        status,
      })
      .eq('id', id)

    if (updateIdError) {
      return NextResponse.json(
        { error: updateIdError.message },
        { status: 400 }
      )
    }

    const guardStatus =
      status === 'active'
        ? 'active'
        : status === 'suspended'
        ? 'suspended'
        : status === 'revoked'
        ? 'revoked'
        : status === 'expired'
        ? 'expired'
        : 'inactive'

    const { error: updateGuardError } = await supabase
      .from('guards')
      .update({ status: guardStatus })
      .eq('id', existing.guard_id)

    if (updateGuardError) {
      return NextResponse.json(
        { error: updateGuardError.message },
        { status: 400 }
      )
    }

    const { error: auditError } = await supabase.from('audit_logs').insert([
      {
        action_type: 'update_guard_id',
        entity_type: 'guard_id',
        entity_id: id,
        metadata: {
          guard_id: existing.guard_id,
          id_number,
          role_title,
          site_name,
          sia_number,
          issue_date,
          expiry_date,
          status,
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
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update digital ID.' },
      { status: 500 }
    )
  }
}