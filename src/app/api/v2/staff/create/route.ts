import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'archived']
const ALLOWED_TYPES = ['security', 'warehouse', 'event', 'admin', 'contractor', 'other']

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const employee_code = typeof body.employee_code === 'string' ? body.employee_code.trim() : ''
    const company_name = typeof body.company_name === 'string' && body.company_name.trim() ? body.company_name.trim() : null
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
    const second_phone = typeof body.second_phone === 'string' && body.second_phone.trim() ? body.second_phone.trim() : null
    const staff_type = typeof body.staff_type === 'string' ? body.staff_type.trim() : 'security'
    const status = typeof body.status === 'string' ? body.status.trim() : 'active'
    const nationality = typeof body.nationality === 'string' && body.nationality.trim() ? body.nationality.trim() : null
    const country_of_birth = typeof body.country_of_birth === 'string' && body.country_of_birth.trim() ? body.country_of_birth.trim() : null
    const gender = typeof body.gender === 'string' && body.gender.trim() ? body.gender.trim() : null
    const date_of_birth = typeof body.date_of_birth === 'string' && body.date_of_birth.trim() ? body.date_of_birth.trim() : null
    const access_to_car = typeof body.access_to_car === 'boolean' ? body.access_to_car : false
    const driver_licence = typeof body.driver_licence === 'boolean' ? body.driver_licence : false
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    const photo_url = typeof body.photo_url === 'string' && body.photo_url.trim() ? body.photo_url.trim() : null
    const parim_staff_id = typeof body.parim_staff_id === 'string' && body.parim_staff_id.trim() ? body.parim_staff_id.trim()  : null

    if (!full_name || !employee_code) {
      return NextResponse.json(
        { error: 'Full name and employee code are required.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(staff_type)) {
      return NextResponse.json(
        { error: 'Invalid staff type.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await supabase.auth.getUser()

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', currentUser.id)
      .single()

    if (
      profileError ||
      !currentProfile ||
      !['super_admin', 'admin', 'manager'].includes(currentProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Forbidden.' },
        { status: 403 }
      )
    }

    const { data: existingStaff } = await adminSupabase
      .from('staff')
      .select('id')
      .eq('employee_code', employee_code)
      .maybeSingle()

    if (existingStaff) {
      return NextResponse.json(
        { error: 'Employee code already exists.' },
        { status: 400 }
      )
    }

    const { data: createdStaff, error: createError } = await adminSupabase
      .from('staff')
      .insert([
        {
          full_name,
          parim_staff_id,
          employee_code,
          company_name,
          email,
          phone,
          second_phone,
          staff_type,
          status,
          nationality,
          country_of_birth,
          gender,
          date_of_birth,
          access_to_car,
          driver_licence,
          notes,
          photo_url,
          import_source: 'manual_v2',
        },
      ])
      .select('id')
      .single()

    if (createError || !createdStaff) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create staff record.' },
        { status: 400 }
      )
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: currentProfile.id,
        action_type: 'create_staff_v2',
        entity_type: 'staff',
        entity_id: createdStaff.id,
        metadata: {
          full_name,
          employee_code,
          company_name,
          email,
          staff_type,
          status,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      staff_id: createdStaff.id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}