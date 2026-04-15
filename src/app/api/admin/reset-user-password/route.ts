import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const profile_id =
      typeof body.profile_id === 'string' ? body.profile_id.trim() : ''
    const password =
      typeof body.password === 'string' ? body.password : ''

    if (!profile_id || !password) {
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

    // Current logged-in user client (uses cookies/session)
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
        { error: 'Only admin and super_admin can reset passwords.' },
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

    const { data: targetProfile, error: targetProfileError } = await adminSupabase
      .from('profiles')
      .select('id, auth_user_id, email, role')
      .eq('id', profile_id)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: 'Target user not found.' },
        { status: 404 }
      )
    }

    // Optional safety: prevent a normal admin from resetting a super_admin password
    if (
      currentProfile.role !== 'super_admin' &&
      targetProfile.role === 'super_admin'
    ) {
      return NextResponse.json(
        { error: 'Only super_admin can reset another super_admin password.' },
        { status: 403 }
      )
    }

    const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(
      targetProfile.auth_user_id,
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
          action_type: 'reset_user_password',
          entity_type: 'profile',
          entity_id: profile_id,
          metadata: {
            reset_by_profile_id: currentProfile.id,
            target_auth_user_id: targetProfile.auth_user_id,
            target_email: targetProfile.email,
            target_role: targetProfile.role,
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
      message: 'Password updated successfully.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to reset password.' },
      { status: 500 }
    )
  }
}