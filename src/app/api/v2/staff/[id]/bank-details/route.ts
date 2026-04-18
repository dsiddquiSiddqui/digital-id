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
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin', 'manager'].includes(profile.role)) {
    return { error: 'Forbidden.', status: 403 as const, profile: null }
  }

  return { error: null, status: 200 as const, profile }
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
      .from('staff_bank_details')
      .select('*')
      .eq('staff_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ bank_details: data || null })
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

    if (access.error || !access.profile) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const body = await request.json()
    const adminSupabase = createAdminClient()

    const account_holder_name =
      typeof body.account_holder_name === 'string' && body.account_holder_name.trim()
        ? body.account_holder_name.trim()
        : null

    const bank_account_number =
      typeof body.bank_account_number === 'string' && body.bank_account_number.trim()
        ? body.bank_account_number.trim()
        : null

    const sort_code =
      typeof body.sort_code === 'string' && body.sort_code.trim()
        ? body.sort_code.trim()
        : null

    const reference_number =
      typeof body.reference_number === 'string' && body.reference_number.trim()
        ? body.reference_number.trim()
        : null

    const { data: existingStaff } = await adminSupabase
      .from('staff')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const { data: existingBank } = await adminSupabase
      .from('staff_bank_details')
      .select('id')
      .eq('staff_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let resultData = null
    let dbError = null

    if (existingBank) {
      const result = await adminSupabase
        .from('staff_bank_details')
        .update({
          account_holder_name,
          bank_account_number,
          sort_code,
          reference_number,
        })
        .eq('id', existingBank.id)
        .select('*')
        .single()

      resultData = result.data
      dbError = result.error
    } else {
      const result = await adminSupabase
        .from('staff_bank_details')
        .insert([
          {
            staff_id: id,
            account_holder_name,
            bank_account_number,
            sort_code,
            reference_number,
          },
        ])
        .select('*')
        .single()

      resultData = result.data
      dbError = result.error
    }

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: existingBank ? 'update_staff_bank_details_v2' : 'create_staff_bank_details_v2',
        entity_type: 'staff_bank_details',
        entity_id: resultData.id,
        metadata: {
          staff_id: id,
          account_holder_name,
          sort_code,
          reference_number,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      bank_details: resultData,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}