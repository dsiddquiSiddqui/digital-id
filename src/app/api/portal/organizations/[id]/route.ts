import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'

async function requirePortalAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) {
    return null
  }

  return profile
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const { id } = await context.params
    const adminSupabase = createAdminClient()

    const [organization, users, staff, subscription, usage, activity, securityEvents, supportTickets] = await Promise.all([
      adminSupabase
        .from('organizations')
        .select('id, name, slug, status, plan, created_at, updated_at')
        .eq('id', id)
        .single(),
      adminSupabase
        .from('profiles')
        .select('id, full_name, email, phone, role, is_active, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: true }),
      adminSupabase
        .from('staff')
        .select('id, full_name, employee_code, email, phone, staff_type, status, profile_id, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false }),
      adminSupabase
        .from('organization_subscriptions')
        .select('id, provider, provider_customer_id, provider_subscription_id, status, plan, current_period_end, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      getOrganizationPlanUsage(adminSupabase, id),
      adminSupabase
        .from('audit_logs')
        .select('id, action_type, entity_type, entity_id, metadata, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      adminSupabase
        .from('security_events')
        .select('id, event_type, severity, event_payload, reviewed_at, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(25),
      adminSupabase
        .from('support_tickets')
        .select('id, ticket_number, subject, category, priority, status, response_summary, created_at, updated_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(25),
    ])

    if (organization.error || !organization.data) {
      return NextResponse.json(
        { error: organization.error?.message || 'Organization not found.' },
        { status: organization.error?.code === 'PGRST116' ? 404 : 400 }
      )
    }
    if (users.error) return NextResponse.json({ error: users.error.message }, { status: 400 })
    if (staff.error) return NextResponse.json({ error: staff.error.message }, { status: 400 })
    if (subscription.error) return NextResponse.json({ error: subscription.error.message }, { status: 400 })
    if (activity.error) return NextResponse.json({ error: activity.error.message }, { status: 400 })
    if (securityEvents.error) return NextResponse.json({ error: securityEvents.error.message }, { status: 400 })
    if (supportTickets.error) return NextResponse.json({ error: supportTickets.error.message }, { status: 400 })

    const accountUsers = (users.data || []).filter((user) => user.role !== 'staff')
    const accountOwner =
      accountUsers.find((user) => user.role === 'admin' && user.is_active) ||
      accountUsers.find((user) => user.role === 'admin') ||
      accountUsers.find((user) => user.is_active) ||
      accountUsers[0] ||
      null

    return NextResponse.json({
      organization: organization.data,
      accountOwner,
      users: accountUsers,
      staff: staff.data || [],
      subscription: subscription.data || null,
      usage,
      activity: activity.data || [],
      securityEvents: securityEvents.data || [],
      supportTickets: supportTickets.data || [],
    })
  } catch (error) {
    console.error('Portal organization detail error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
