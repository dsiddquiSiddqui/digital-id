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

    if (access.error || !access.profile) {
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
      .select('id')
      .eq('id', id)
      .single()

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const { data: existingAddress } = await adminSupabase
      .from('staff_addresses')
      .select('id')
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

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: existingAddress ? 'update_staff_address_v2' : 'create_staff_address_v2',
        entity_type: 'staff_address',
        entity_id: resultData.id,
        metadata: {
          staff_id: id,
          city,
          post_code,
          country,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      address: resultData,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}