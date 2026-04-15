import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const guard_id =
      typeof body.guard_id === 'string' ? body.guard_id.trim() : ''
    const password =
      typeof body.password === 'string' ? body.password : ''

    if (!guard_id || !password) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Admin profile not found.' },
        { status: 403 }
      )
    }

    if (!['admin', 'super_admin'].includes(currentProfile.role)) {
      return NextResponse.json(
        { error: 'Only admin and super_admin can reset guard passwords.' },
        { status: 403 }
      )
    }

    if (!currentProfile.is_active) {
      return NextResponse.json(
        { error: 'Inactive admins cannot reset passwords.' },
        { status: 403 }
      )
    }

    const adminSupabase = createAdminClient()

    const { data: guard, error: guardError } = await adminSupabase
      .from('guards')
      .select('id, full_name, email, profile_id')
      .eq('id', guard_id)
      .single()

    if (guardError || !guard) {
      return NextResponse.json(
        { error: 'Guard not found.' },
        { status: 404 }
      )
    }

    if (!guard.profile_id) {
      return NextResponse.json(
        { error: 'This guard is not linked to a login profile.' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, auth_user_id, role')
      .eq('id', guard.profile_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Linked profile not found.' },
        { status: 404 }
      )
    }

    if (profile.role !== 'guard') {
      return NextResponse.json(
        { error: 'Linked profile is not a guard account.' },
        { status: 400 }
      )
    }

    const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(
      profile.auth_user_id,
      { password }
    )

    if (passwordError) {
      return NextResponse.json(
        { error: passwordError.message },
        { status: 400 }
      )
    }

    const { error: auditError } = await adminSupabase
      .from('audit_logs')
      .insert([
        {
          action_type: 'reset_guard_password',
          entity_type: 'guard',
          entity_id: guard_id,
          metadata: {
            reset_by_profile_id: currentProfile.id,
            guard_name: guard.full_name,
            guard_email: guard.email,
            profile_id: profile.id,
            auth_user_id: profile.auth_user_id,
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
      message: 'Guard password updated successfully.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to reset guard password.' },
      { status: 500 }
    )
  }
}