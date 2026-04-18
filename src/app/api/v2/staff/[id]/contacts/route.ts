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
      .from('staff_emergency_contacts')
      .select('*')
      .eq('staff_id', id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ contacts: data || [] })
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

    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : ''

    const relationship =
      typeof body.relationship === 'string' && body.relationship.trim()
        ? body.relationship.trim()
        : null

    const phone =
      typeof body.phone === 'string' && body.phone.trim()
        ? body.phone.trim()
        : null

    const email =
      typeof body.email === 'string' && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null

    const is_primary =
      typeof body.is_primary === 'boolean' ? body.is_primary : false

    if (!name) {
      return NextResponse.json(
        { error: 'Contact name is required.' },
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

    if (is_primary) {
      await adminSupabase
        .from('staff_emergency_contacts')
        .update({ is_primary: false })
        .eq('staff_id', id)
    }

    const { data, error } = await adminSupabase
      .from('staff_emergency_contacts')
      .insert([
        {
          staff_id: id,
          name,
          relationship,
          phone,
          email,
          is_primary,
        },
      ])
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: 'create_staff_emergency_contact_v2',
        entity_type: 'staff_emergency_contact',
        entity_id: data.id,
        metadata: {
          staff_id: id,
          name,
          relationship,
          is_primary,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      contact: data,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(
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

    const contact_id =
      typeof body.contact_id === 'string' ? body.contact_id.trim() : ''

    const is_primary =
      typeof body.is_primary === 'boolean' ? body.is_primary : false

    if (!contact_id) {
      return NextResponse.json({ error: 'Missing contact_id.' }, { status: 400 })
    }

    const { data: existingContact } = await adminSupabase
      .from('staff_emergency_contacts')
      .select('id, staff_id')
      .eq('id', contact_id)
      .eq('staff_id', id)
      .single()

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })
    }

    if (is_primary) {
      await adminSupabase
        .from('staff_emergency_contacts')
        .update({ is_primary: false })
        .eq('staff_id', id)

      await adminSupabase
        .from('staff_emergency_contacts')
        .update({ is_primary: true })
        .eq('id', contact_id)
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: 'update_staff_emergency_contact_v2',
        entity_type: 'staff_emergency_contact',
        entity_id: contact_id,
        metadata: {
          staff_id: id,
          is_primary,
        },
      },
    ])

    return NextResponse.json({
      success: true,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(
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

    const contact_id =
      typeof body.contact_id === 'string' ? body.contact_id.trim() : ''

    if (!contact_id) {
      return NextResponse.json({ error: 'Missing contact_id.' }, { status: 400 })
    }

    const { data: existingContact } = await adminSupabase
      .from('staff_emergency_contacts')
      .select('id, staff_id')
      .eq('id', contact_id)
      .eq('staff_id', id)
      .single()

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })
    }

    const { error } = await adminSupabase
      .from('staff_emergency_contacts')
      .delete()
      .eq('id', contact_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: 'delete_staff_emergency_contact_v2',
        entity_type: 'staff_emergency_contact',
        entity_id: contact_id,
        metadata: {
          staff_id: id,
        },
      },
    ])

    return NextResponse.json({
      success: true,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}