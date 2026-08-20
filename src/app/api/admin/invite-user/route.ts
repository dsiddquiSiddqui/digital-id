import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import {
  actorMetadata,
  ADMIN_ROLES,
  requireAdminAccess,
} from '@/lib/admin-auth'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'
import { sendTransactionalEmail } from '@/lib/email'

const INVITABLE_ROLES = [
  'admin',
  'manager',
  'staff',
  'guard',
  'hr_manager',
  'hr',
  'operation_manager',
  'operation_team',
]

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const email = text(body.email).toLowerCase()
    const fullName = text(body.full_name)
    const role = text(body.role)

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }

    if (!INVITABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Choose a valid role.' }, { status: 400 })
    }

    const organizationId = result.access.profile.organization_id!
    const usage = await getOrganizationPlanUsage(result.access.adminSupabase, organizationId)

    if (
      usage.limits.users !== null &&
      usage.usage.users >= usage.limits.users
    ) {
      return NextResponse.json(
        { error: `This package allows ${usage.limits.users} users. Upgrade before inviting more users.` },
        { status: 400 }
      )
    }

    const { data: existingUser } = await result.access.adminSupabase
      .from('profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists in this organization.' },
        { status: 400 }
      )
    }

    const token = randomBytes(24).toString('hex')
    const { data: invitation, error } = await result.access.adminSupabase
      .from('user_invitations')
      .insert({
        organization_id: organizationId,
        invited_by: result.access.profile.id,
        email,
        full_name: fullName || null,
        role,
        token,
      })
      .select('*')
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: error?.message || 'Unable to create invitation.' },
        { status: 400 }
      )
    }

    await result.access.adminSupabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_profile_id: result.access.profile.id,
      action_type: 'user_invited',
      entity_type: 'user_invitation',
      entity_id: invitation.id,
      metadata: {
        ...actorMetadata(result.access),
        module: 'Users',
        page: '/users/invite',
        invited_email: email,
        invited_role: role,
      },
    })

    const inviteUrl = `/invite/${token}`
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const fullInviteUrl = `${origin}${inviteUrl}`
    const emailResult = await sendTransactionalEmail({
      organizationId,
      profileId: result.access.profile.id,
      to: email,
      subject: `You have been invited to ${usage.organization?.name || 'Digital ID X'}`,
      templateKey: 'user_invitation',
      metadata: {
        invitation_id: invitation.id,
        organization_name: usage.organization?.name || 'Digital ID X',
        full_name: fullName || email,
        invite_url: fullInviteUrl,
        role,
      },
      text: `You have been invited. Open this link: ${fullInviteUrl}`,
      html: `
        <p>You have been invited to ${usage.organization?.name || 'Digital ID X'}.</p>
        <p><a href="${fullInviteUrl}">Accept invitation</a></p>
      `,
    })

    return NextResponse.json({
      invitation,
      invite_url: inviteUrl,
      email_status: emailResult.status,
      note:
        emailResult.status === 'sent'
          ? 'Invitation email sent.'
          : 'Invitation created. Email delivery is not configured, so copy the link manually.',
    })
  } catch (error) {
    console.error('Invite user error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data } = await result.access.adminSupabase
      .from('user_invitations')
      .select('*')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ invitations: data || [] })
  } catch (error) {
    console.error('Load invitations error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
