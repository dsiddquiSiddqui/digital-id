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
      .from('staff_employment')
      .select('*')
      .eq('staff_id', id)
      .eq('is_current', true)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ employment: data || null })
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

    const employment_type =
      typeof body.employment_type === 'string' && body.employment_type.trim()
        ? body.employment_type.trim()
        : null

    const contract_number =
      typeof body.contract_number === 'string' && body.contract_number.trim()
        ? body.contract_number.trim()
        : null

    const contract_start =
      typeof body.contract_start === 'string' && body.contract_start.trim()
        ? body.contract_start.trim()
        : null

    const contract_end =
      typeof body.contract_end === 'string' && body.contract_end.trim()
        ? body.contract_end.trim()
        : null

    const pay_schedule =
      typeof body.pay_schedule === 'string' && body.pay_schedule.trim()
        ? body.pay_schedule.trim()
        : null

    const payroll_reference =
      typeof body.payroll_reference === 'string' && body.payroll_reference.trim()
        ? body.payroll_reference.trim()
        : null

    const tax_code =
      typeof body.tax_code === 'string' && body.tax_code.trim()
        ? body.tax_code.trim()
        : null

    const ni_number =
      typeof body.ni_number === 'string' && body.ni_number.trim()
        ? body.ni_number.trim()
        : null

    const personal_pay_rate =
      typeof body.personal_pay_rate === 'number' ? body.personal_pay_rate : null

    if (contract_start && contract_end && contract_end <= contract_start) {
      return NextResponse.json(
        { error: 'Contract end date must be later than contract start date.' },
        { status: 400 }
      )
    }

    const { data: existingStaff } = await adminSupabase
      .from('staff')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const { data: existingEmployment } = await adminSupabase
      .from('staff_employment')
      .select('id')
      .eq('staff_id', id)
      .eq('is_current', true)
      .maybeSingle()

    let resultData = null
    let dbError = null

    if (existingEmployment) {
      const result = await adminSupabase
        .from('staff_employment')
        .update({
          employment_type,
          contract_number,
          contract_start,
          contract_end,
          pay_schedule,
          payroll_reference,
          tax_code,
          ni_number,
          personal_pay_rate,
        })
        .eq('id', existingEmployment.id)
        .select('*')
        .single()

      resultData = result.data
      dbError = result.error
    } else {
      const result = await adminSupabase
        .from('staff_employment')
        .insert([
          {
            staff_id: id,
            employment_type,
            contract_number,
            contract_start,
            contract_end,
            pay_schedule,
            payroll_reference,
            tax_code,
            ni_number,
            personal_pay_rate,
            is_current: true,
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
        action_type: existingEmployment ? 'update_staff_employment_v2' : 'create_staff_employment_v2',
        entity_type: 'staff_employment',
        entity_id: resultData.id,
        metadata: {
          staff_id: id,
          employment_type,
          contract_number,
          contract_start,
          contract_end,
          pay_schedule,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      employment: resultData,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}