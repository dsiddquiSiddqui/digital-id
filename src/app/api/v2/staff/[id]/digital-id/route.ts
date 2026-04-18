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
      .from('staff_ids')
      .select('*')
      .eq('staff_id', id)
      .eq('is_current', true)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      digital_id: data || null,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}