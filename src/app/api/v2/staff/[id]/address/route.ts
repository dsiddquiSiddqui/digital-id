import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: 'Unauthorized.',
      status: 401 as const,
      profile: null,
      user: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin', 'manager'].includes(profile.role)) {
    return {
      error: 'Forbidden.',
      status: 403 as const,
      profile: null,
      user: null,
    }
  }

  return {
    error: null,
    status: 200 as const,
    profile,
    user,
  }
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
      .from('staff_addresses')
      .select('*')
      .eq('staff_id', id)
      .eq('is_current', true)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ address: data || null })
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

    if (access.error || !access.profile || !access.user) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const body = await request.json()
    const adminSupabase = createAdminClient()

    const street_address =
      typeof body.street_address === 'string' && body.street_address.trim()
        ? body.street_address.trim()
        : null

    const city =
      typeof body.city === 'string' && body.city.trim()
        ? body.city.trim()
        : null

    const post_code =
      typeof body.post_code === 'string' && body.post_code.trim()
        ? body.post_code.trim()
        : null

    const country =
      typeof body.country === 'string' && body.country.trim()
        ? body.country.trim()
        : null

    const { data: existingStaff } = await adminSupabase
      .from('staff')
      .select('id, full_name')
      .eq('id', id)
      .single()

    if (!existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found.' },
        { status: 404 }
      )
    }

    const { data: existingAddress } = await adminSupabase
      .from('staff_addresses')
      .select('*')
      .eq('staff_id', id)
      .eq('is_current', true)
      .maybeSingle()

    let resultData = null
    let dbError = null

    if (existingAddress) {
      const result = await adminSupabase
        .from('staff_addresses')
        .update({
          street_address,
          city,
          post_code,
          country,
        })
        .eq('id', existingAddress.id)
        .select('*')
        .single()

      resultData = result.data
      dbError = result.error
    } else {
      const result = await adminSupabase
        .from('staff_addresses')
        .insert([
          {
            staff_id: id,
            street_address,
            city,
            post_code,
            country,
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

    const changes = []

    if (existingAddress) {
      if (existingAddress.street_address !== street_address) {
        changes.push({
          field: 'street_address',
          before: existingAddress.street_address,
          after: street_address,
        })
      }

      if (existingAddress.city !== city) {
        changes.push({
          field: 'city',
          before: existingAddress.city,
          after: city,
        })
      }

      if (existingAddress.post_code !== post_code) {
        changes.push({
          field: 'post_code',
          before: existingAddress.post_code,
          after: post_code,
        })
      }

      if (existingAddress.country !== country) {
        changes.push({
          field: 'country',
          before: existingAddress.country,
          after: country,
        })
      }
    } else {
      changes.push(
        {
          field: 'street_address',
          before: null,
          after: street_address,
        },
        {
          field: 'city',
          before: null,
          after: city,
        },
        {
          field: 'post_code',
          before: null,
          after: post_code,
        },
        {
          field: 'country',
          before: null,
          after: country,
        }
      )
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,

        action_type: existingAddress
          ? 'Update Staff Address'
          : 'Create Staff Address',

        entity_type: 'staff_address',

        entity_id: resultData.id,

        metadata: {
          actor_name:
            access.profile.full_name ||
            access.user.email ||
            'Unknown user',

          actor_email:
            access.profile.email || access.user.email || null,

          actor_role: access.profile.role,

          module: 'Staff Management',

          page: `/admin/staff/${id}/address`,

          staff_id: id,

          staff_name: existingStaff.full_name,

          changes,

          note: existingAddress
            ? `Address updated for ${existingStaff.full_name}.`
            : `Address created for ${existingStaff.full_name}.`,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      address: resultData,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}