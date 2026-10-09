import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    const { data: invitation } = await supabase
      .from('user_invitations')
      .select('id, email, full_name, role, status, expires_at, organizations(name, slug, logo_url)')
      .eq('token', token)
      .maybeSingle()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 })
    }

    if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation is no longer valid.' }, { status: 400 })
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Invitation load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const ip = request.headers.get('x-forwarded-for') || 'local'
    const limited = await checkRateLimit({
      key: `invite:${token}:${ip}`,
      limit: 6,
      windowMs: 10 * 60 * 1000,
      route: '/api/invitations/[token]',
    })

    if (!limited.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const password = text(body.password)
    const fullName = text(body.full_name)

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: invitation } = await supabase
      .from('user_invitations')
      .select('id, organization_id, staff_id, email, full_name, role, status, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 })
    }

    if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return NextResponse.json({ error: 'This invitation is no longer valid.' }, { status: 400 })
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invitation.email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json({ error: 'A profile already exists for this email.' }, { status: 400 })
    }

    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || invitation.full_name || invitation.email,
        role: invitation.role,
      },
    })

    if (authError || !authResult.user) {
      return NextResponse.json({ error: authError?.message || 'Unable to create account.' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        organization_id: invitation.organization_id,
        auth_user_id: authResult.user.id,
        role: invitation.role,
        full_name: fullName || invitation.full_name || invitation.email,
        email: invitation.email,
        is_active: true,
      })
      .select('id')
      .single()

    if (profileError || !profile) {
      await supabase.auth.admin.deleteUser(authResult.user.id)
      return NextResponse.json({ error: profileError?.message || 'Unable to create profile.' }, { status: 400 })
    }

    if (invitation.staff_id) {
      await supabase.from('staff').update({ profile_id: profile.id, status: 'active' }).eq('id', invitation.staff_id).eq('organization_id', invitation.organization_id)
    }

    await supabase
      .from('user_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    await supabase.from('audit_logs').insert({
      organization_id: invitation.organization_id,
      actor_profile_id: profile.id,
      action_type: 'invitation_accepted',
      entity_type: 'profile',
      entity_id: profile.id,
      metadata: {
        invited_email: invitation.email,
        role: invitation.role,
        module: 'Users',
        page: `/invite/${token}`,
      },
    })

    return NextResponse.json({ success: true, redirect_to: '/login?invited=1' })
  } catch (error) {
    console.error('Invitation accept error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
