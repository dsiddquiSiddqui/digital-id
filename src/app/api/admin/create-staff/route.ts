import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      full_name,
      employee_code,
      company_name,
      phone,
      email,
      password,
      status,
      photo_url,
    } = body

    if (!full_name || !employee_code || !company_name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
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

    if (profileError || !currentProfile || currentProfile.role !== 'super_admin') {
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

    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Email already exists.' },
        { status: 400 }
      )
    }

    const { data: createdAuthUser, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'staff',
          full_name,
        },
      })

    if (authError || !createdAuthUser.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user.' },
        { status: 400 }
      )
    }

    const authUserId = createdAuthUser.user.id

    const { data: createdProfile, error: createdProfileError } =
      await adminSupabase
        .from('profiles')
        .insert([
          {
            auth_user_id: authUserId,
            role: 'staff',
            full_name,
            email,
            phone: phone || null,
            is_active: true,
          },
        ])
        .select('id')
        .single()

    if (createdProfileError || !createdProfile) {
      await adminSupabase.auth.admin.deleteUser(authUserId)

      return NextResponse.json(
        { error: createdProfileError?.message || 'Failed to create profile.' },
        { status: 400 }
      )
    }

    const { data: createdStaff, error: createdStaffError } = await adminSupabase
      .from('staff')
      .insert([
        {
          profile_id: createdProfile.id,
          employee_code,
          full_name,
          company_name,
          phone: phone || null,
          email,
          status: status || 'active',
          photo_url: photo_url || null,
        },
      ])
      .select('id')
      .single()

    if (createdStaffError || !createdStaff) {
      await adminSupabase.from('profiles').delete().eq('id', createdProfile.id)
      await adminSupabase.auth.admin.deleteUser(authUserId)

      return NextResponse.json(
        { error: createdStaffError?.message || 'Failed to create staff record.' },
        { status: 400 }
      )
    }

    const { error: auditError } = await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: currentProfile.id,
        action_type: 'create_staff_account',
        entity_type: 'staff',
        entity_id: createdStaff.id,
        metadata: {
          email,
          employee_code,
        },
      },
    ])

    if (auditError) {
      console.error('Audit log insert failed:', auditError.message)
    }

    return NextResponse.json({
      success: true,
      staff_id: createdStaff.id,
      auth_user_id: authUserId,
      profile_id: createdProfile.id,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}