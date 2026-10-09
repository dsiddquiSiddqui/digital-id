import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email'

const USER_ROLES = ['admin', 'manager', 'hr_manager', 'hr', 'operation_manager', 'operation_team', 'guard']
const STAFF_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'expired', 'archived']

async function requireAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name, email, is_active, platform_role, platform_permissions').eq('auth_user_id', user.id).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) return null
  const permissions = Array.isArray(profile.platform_permissions) ? profile.platform_permissions : []
  if (!['owner', 'administrator'].includes(profile.platform_role || 'administrator') && !permissions.includes('organizations.manage')) return null
  return profile
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const { id: organizationId } = await context.params
    const body = await request.json()
    if (body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Explicit confirmation is required.' }, { status: 400 })
    const admin = createAdminClient()

    if (body.target_type === 'user') {
      const profileId = typeof body.target_id === 'string' ? body.target_id : ''
      const { data: target } = await admin.from('profiles').select('id, auth_user_id, full_name, email, role, is_active').eq('id', profileId).eq('organization_id', organizationId).neq('role', 'super_admin').maybeSingle()
      if (!target) return NextResponse.json({ error: 'Organization user not found.' }, { status: 404 })
      const removesAdminAccess = (body.action === 'status' && body.is_active === false) || (body.action === 'role' && body.role !== 'admin')
      if (target.role === 'admin' && removesAdminAccess) {
        const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('role', 'admin').eq('is_active', true).neq('id', target.id)
        if (!count) return NextResponse.json({ error: 'Assign another active administrator before changing the final administrator.' }, { status: 400 })
      }
      if (body.action === 'status' && typeof body.is_active === 'boolean') {
        const { data, error } = await admin.from('profiles').update({ is_active: body.is_active }).eq('id', target.id).select('id, full_name, email, phone, role, is_active, created_at').single()
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        await audit(admin, organizationId, access, 'portal_user_status_changed', 'profile', target.id, { previous: { is_active: target.is_active }, changes: { is_active: body.is_active }, target_name: target.full_name })
        return NextResponse.json({ user: data })
      }
      if (body.action === 'role' && USER_ROLES.includes(body.role)) {
        const { data, error } = await admin.from('profiles').update({ role: body.role }).eq('id', target.id).select('id, full_name, email, phone, role, is_active, created_at').single()
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        await audit(admin, organizationId, access, 'portal_user_role_changed', 'profile', target.id, { previous: { role: target.role }, changes: { role: body.role }, target_name: target.full_name })
        return NextResponse.json({ user: data })
      }
      if (body.action === 'password') {
        const password = typeof body.password === 'string' ? body.password : ''
        if (password.length < 12) return NextResponse.json({ error: 'Temporary password must be at least 12 characters.' }, { status: 400 })
        if (!target.auth_user_id) return NextResponse.json({ error: 'This user has no linked authentication account.' }, { status: 400 })
        const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, { password })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        await admin.from('profiles').update({ force_password_change: true }).eq('id', target.id)
        await audit(admin, organizationId, access, 'portal_user_password_changed', 'profile', target.id, { target_name: target.full_name, target_email: target.email, password_value_stored: false })
        return NextResponse.json({ success: true })
      }
      if (body.action === 'mfa_reset') {
        if (!target.auth_user_id) return NextResponse.json({ error: 'This user has no linked authentication account.' }, { status: 400 })
        const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: target.auth_user_id })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        for (const factor of data.factors) {
          const deleted = await admin.auth.admin.mfa.deleteFactor({ userId: target.auth_user_id, id: factor.id })
          if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 400 })
        }
        await audit(admin, organizationId, access, 'portal_user_mfa_reset', 'profile', target.id, { target_name: target.full_name, factors_removed: data.factors.length })
        return NextResponse.json({ success: true, factors_removed: data.factors.length })
      }
    }

    if (body.target_type === 'staff') {
      const staffId = typeof body.target_id === 'string' ? body.target_id : ''
      const { data: staff } = await admin.from('staff').select('id, profile_id, full_name, email, status').eq('id', staffId).eq('organization_id', organizationId).maybeSingle()
      if (!staff) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
      if (body.action === 'status' && STAFF_STATUSES.includes(body.status)) {
        const { data, error } = await admin.from('staff').update({ status: body.status }).eq('id', staff.id).select('id, full_name, employee_code, email, phone, staff_type, status, profile_id, created_at').single()
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        if (staff.profile_id) await admin.from('profiles').update({ is_active: body.status === 'active' }).eq('id', staff.profile_id).eq('organization_id', organizationId)
        await audit(admin, organizationId, access, 'portal_staff_status_changed', 'staff', staff.id, { previous: { status: staff.status }, changes: { status: body.status, login_active: body.status === 'active' }, target_name: staff.full_name })
        return NextResponse.json({ staff: data })
      }
      if (body.action === 'password') {
        const password = typeof body.password === 'string' ? body.password : ''
        if (password.length < 12) return NextResponse.json({ error: 'Temporary password must be at least 12 characters.' }, { status: 400 })
        if (!staff.profile_id) return NextResponse.json({ error: 'This staff member has no linked login account.' }, { status: 400 })
        const { data: profile } = await admin.from('profiles').select('id, auth_user_id').eq('id', staff.profile_id).eq('organization_id', organizationId).maybeSingle()
        if (!profile?.auth_user_id) return NextResponse.json({ error: 'Linked authentication account not found.' }, { status: 404 })
        const { error } = await admin.auth.admin.updateUserById(profile.auth_user_id, { password })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        await admin.from('profiles').update({ force_password_change: true }).eq('id', profile.id)
        await audit(admin, organizationId, access, 'portal_staff_password_changed', 'staff', staff.id, { target_name: staff.full_name, target_email: staff.email, profile_id: profile.id, password_value_stored: false })
        return NextResponse.json({ success: true })
      }
    }
    return NextResponse.json({ error: 'Unsupported access action.' }, { status: 400 })
  } catch (error) {
    console.error('Portal organization access error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const { id: organizationId } = await context.params
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const role = body.kind === 'staff_login' ? 'staff' : USER_ROLES.includes(body.role) ? body.role : ''
    if (!email.includes('@') || !role) return NextResponse.json({ error: 'A valid email and role are required.' }, { status: 400 })
    const admin = createAdminClient()
    const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (existing) return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 400 })
    let staffId: string | null = null
    if (body.kind === 'staff_login') {
      staffId = typeof body.staff_id === 'string' ? body.staff_id : null
      const { data: staff } = await admin.from('staff').select('id, full_name, email, profile_id').eq('id', staffId || '').eq('organization_id', organizationId).maybeSingle()
      if (!staff || staff.profile_id) return NextResponse.json({ error: 'Staff member is unavailable or already has a login.' }, { status: 400 })
      if (!staff.email || staff.email.toLowerCase() !== email) return NextResponse.json({ error: 'Use the email stored on the staff record.' }, { status: 400 })
    }
    const token = randomBytes(24).toString('hex')
    const { data: invitation, error } = await admin.from('user_invitations').insert({ organization_id: organizationId, invited_by: access.id, staff_id: staffId, email, full_name: fullName || email, role, token }).select('id, email, role, expires_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const inviteUrl = `${origin}/invite/${token}`
    const mail = await sendTransactionalEmail({ organizationId, profileId: access.id, to: email, subject: 'Your Digital ID X account invitation', templateKey: 'user_invitation', metadata: { invitation_id: invitation.id, invite_url: inviteUrl, role }, text: `Create your account: ${inviteUrl}`, html: `<p>You have been invited to Digital ID X.</p><p><a href="${inviteUrl}">Create your account</a></p>` })
    await audit(admin, organizationId, access, staffId ? 'portal_staff_login_invited' : 'portal_user_invited', staffId ? 'staff' : 'user_invitation', staffId || invitation.id, { invited_email: email, role, email_status: mail.status })
    return NextResponse.json({ invitation, invite_url: `/invite/${token}`, email_status: mail.status })
  } catch (error) {
    console.error('Portal organization invite error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

async function audit(admin: ReturnType<typeof createAdminClient>, organizationId: string, access: { id: string; full_name: string | null; email: string | null; role: string }, actionType: string, entityType: string, entityId: string, metadata: Record<string, unknown>) {
  await admin.from('audit_logs').insert({ organization_id: organizationId, actor_profile_id: access.id, action_type: actionType, entity_type: entityType, entity_id: entityId, metadata: { ...metadata, actor_name: access.full_name, actor_email: access.email, actor_role: access.role, module: 'Organization Access', page: `/portal/organizations/${organizationId}` } })
}
