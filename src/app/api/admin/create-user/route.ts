import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getBillingPlan } from '@/lib/billing-plans'
import { isSystemUserRole } from '@/lib/user-roles'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const full_name =
      typeof body.full_name === 'string' ? body.full_name.trim() : ''

    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    const phone =
      typeof body.phone === 'string' && body.phone.trim()
        ? body.phone.trim()
        : null

    const password =
      typeof body.password === 'string' ? body.password : ''

    const role =
      typeof body.role === 'string' ? body.role.trim() : ''

    if (!full_name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    if (!isSystemUserRole(role)) {
      return NextResponse.json(
        { error: 'Invalid role.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, organization_id, role, full_name, email')
      .eq('auth_user_id', currentUser.id)
      .single()

    if (
      !currentProfile ||
      !['super_admin', 'admin'].includes(currentProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Forbidden.' },
        { status: 403 }
      )
    }

    if (
      currentProfile.role !== 'super_admin' &&
      role === 'super_admin'
    ) {
      return NextResponse.json(
        { error: 'Only super_admin can create another super_admin.' },
        { status: 403 }
      )
    }

    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 400 }
      )
    }

    const { data: organization } = await adminSupabase
      .from('organizations')
      .select('id, status, plan')
      .eq('id', currentProfile.organization_id)
      .single()

    if (!organization || !['active', 'trialing'].includes(organization.status)) {
      return NextResponse.json(
        { error: 'This organization is not active.' },
        { status: 403 }
      )
    }

    const billingPlan = getBillingPlan(organization.plan)

    if (billingPlan.userLimit !== null) {
      const { count: currentUserCount } = await adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentProfile.organization_id)
        .neq('role', 'staff')

      if ((currentUserCount || 0) >= billingPlan.userLimit) {
        return NextResponse.json(
          {
            error: `${billingPlan.name} plan allows ${billingPlan.userLimit} users. Upgrade the organization plan to add more users.`,
          },
          { status: 403 }
        )
      }
    }

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          organization_id: currentProfile.organization_id,
          role,
        },
        user_metadata: {
          full_name,
        },
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user.' },
        { status: 400 }
      )
    }

    const { data: insertedProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        organization_id: currentProfile.organization_id,
        auth_user_id: authData.user.id,
        full_name,
        email,
        phone,
        role,
        is_active: true,
      })
      .select()
      .single()

    if (profileError || !insertedProfile) {
      await adminSupabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        {
          error: profileError?.message || 'Failed to create profile row.',
          auth_user_id: authData.user.id,
        },
        { status: 400 }
      )
    }

    const { error: auditError } = await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: currentProfile.id,
        organization_id: currentProfile.organization_id,
        action_type: 'create_user',
        entity_type: 'profile',
        entity_id: insertedProfile.id,
        metadata: {
          actor_name:
            currentProfile.full_name ||
            currentUser.email ||
            'Unknown user',

          actor_email:
            currentProfile.email ||
            currentUser.email ||
            null,

          actor_role: currentProfile.role,

          module: 'User Management',
          page: `/admin/users/${insertedProfile.id}`,

          created_user_name: full_name,
          created_user_email: email,
          created_user_role: role,

          auth_user_id: authData.user.id,

          changes: [
            {
              field: 'full_name',
              before: null,
              after: full_name,
            },
            {
              field: 'email',
              before: null,
              after: email,
            },
            {
              field: 'phone',
              before: null,
              after: phone,
            },
            {
              field: 'role',
              before: null,
              after: role,
            },
            {
              field: 'is_active',
              before: null,
              after: true,
            },
          ],

          note: `User ${full_name} was created with ${role} role.`,
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
      message: 'User created successfully.',
      profile: insertedProfile,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create user.' },
      { status: 500 }
    )
  }
}
