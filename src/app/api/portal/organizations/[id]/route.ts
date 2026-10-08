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

    const [organization, users, staff, subscription, usage, activity, securityEvents, supportTickets, billingEvents, supportTasks, approvals, ownerTransfers, planHistory] = await Promise.all([
      adminSupabase
        .from('organizations')
        .select('id, name, slug, status, plan, created_at, updated_at, owner_profile_id, customer_success_profile_id, lifecycle_stage, trial_started_at, trial_ends_at, cancellation_scheduled_at, cancelled_at, cancellation_reason, billing_contact_email, technical_contact_email, data_protection_contact_email, customer_lifetime_value, last_customer_contact_at, next_follow_up_at, churn_risk_reason')
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
      adminSupabase
        .from('billing_events')
        .select('id, event_type, status, provider_event_id, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(25),
      adminSupabase.from('platform_support_tasks').select('id, title, description, status, priority, due_at, completed_at, created_at').eq('organization_id', id).order('created_at', { ascending: false }).limit(25),
      adminSupabase.from('platform_approval_requests').select('id, action_type, entity_type, status, review_note, reviewed_at, expires_at, created_at').eq('organization_id', id).order('created_at', { ascending: false }).limit(25),
      adminSupabase.from('organization_owner_transfers').select('id, previous_owner_profile_id, new_owner_profile_id, reason, created_at').eq('organization_id', id).order('created_at', { ascending: false }).limit(25),
      adminSupabase.from('organization_plan_history').select('id, previous_plan, new_plan, change_type, effective_at, created_at').eq('organization_id', id).order('effective_at', { ascending: false }).limit(25),
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
    if (billingEvents.error) return NextResponse.json({ error: billingEvents.error.message }, { status: 400 })
    if (supportTasks.error) return NextResponse.json({ error: supportTasks.error.message }, { status: 400 })
    if (approvals.error) return NextResponse.json({ error: approvals.error.message }, { status: 400 })
    if (ownerTransfers.error) return NextResponse.json({ error: ownerTransfers.error.message }, { status: 400 })
    if (planHistory.error) return NextResponse.json({ error: planHistory.error.message }, { status: 400 })

    const accountUsers = (users.data || []).filter((user) => user.role !== 'staff')
    const accountOwner =
      accountUsers.find((user) => user.id === organization.data.owner_profile_id) ||
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
      billingEvents: billingEvents.data || [],
      portalNotes: (activity.data || []).filter((event) => event.action_type === 'portal_support_note'),
      supportTasks: supportTasks.data || [],
      approvals: approvals.data || [],
      ownerTransfers: ownerTransfers.data || [],
      planHistory: planHistory.data || [],
    })
  } catch (error) {
    console.error('Portal organization detail error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const { id } = await context.params
    const body = await request.json()
    const kind = body.kind === 'task' ? 'task' : 'note'
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : ''
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : ''
    if (kind === 'note' && note.length < 3) return NextResponse.json({ error: 'Enter a note of at least 3 characters.' }, { status: 400 })
    if (kind === 'task' && title.length < 3) return NextResponse.json({ error: 'Enter a task title of at least 3 characters.' }, { status: 400 })

    const adminSupabase = createAdminClient()
    const { data: organization } = await adminSupabase.from('organizations').select('id, name').eq('id', id).maybeSingle()
    if (!organization) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })

    if (kind === 'task') {
      const priority = ['low', 'normal', 'high', 'urgent'].includes(body.priority) ? body.priority : 'normal'
      const dueAt = typeof body.due_at === 'string' && body.due_at ? body.due_at : null
      const { data: task, error: taskError } = await adminSupabase.from('platform_support_tasks').insert({ organization_id: id, title, description: note || null, priority, due_at: dueAt, created_by_profile_id: access.id }).select('id, title, description, status, priority, due_at, created_at').single()
      if (taskError) return NextResponse.json({ error: taskError.message }, { status: 400 })
      await adminSupabase.from('audit_logs').insert({ organization_id: id, actor_profile_id: access.id, action_type: 'portal_support_task_created', entity_type: 'platform_support_task', entity_id: task.id, metadata: { title, priority, due_at: dueAt, actor_role: access.role, module: 'Platform Portal', page: '/portal' } })
      return NextResponse.json({ task })
    }

    const { data, error } = await adminSupabase.from('audit_logs').insert({
      organization_id: id,
      actor_profile_id: access.id,
      action_type: 'portal_support_note',
      entity_type: 'organization',
      entity_id: id,
      metadata: { note, actor_role: access.role, module: 'Platform Portal', page: '/portal' },
    }).select('id, action_type, metadata, created_at').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ note: data })
  } catch (error) {
    console.error('Portal support note error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const { id } = await context.params
    const body = await request.json()
    if (body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Explicit confirmation is required.' }, { status: 400 })

    const allowedStages = ['lead', 'trial', 'active', 'at_risk', 'cancellation_scheduled', 'cancelled', 'archived']
    const update: Record<string, string | number | null> = {}
    if (typeof body.lifecycle_stage === 'string' && allowedStages.includes(body.lifecycle_stage)) update.lifecycle_stage = body.lifecycle_stage
    for (const field of ['cancellation_reason', 'billing_contact_email', 'technical_contact_email', 'data_protection_contact_email', 'churn_risk_reason'] as const) {
      if (typeof body[field] === 'string' || body[field] === null) update[field] = typeof body[field] === 'string' ? body[field].trim().slice(0, 500) || null : null
    }
    for (const field of ['trial_started_at', 'trial_ends_at', 'cancellation_scheduled_at', 'cancelled_at', 'last_customer_contact_at', 'next_follow_up_at'] as const) {
      if (typeof body[field] === 'string' || body[field] === null) update[field] = body[field] || null
    }
    if (typeof body.customer_lifetime_value === 'number' && body.customer_lifetime_value >= 0) update.customer_lifetime_value = body.customer_lifetime_value

    const adminSupabase = createAdminClient()
    const { data: previous } = await adminSupabase.from('organizations').select('id, owner_profile_id, lifecycle_stage').eq('id', id).maybeSingle()
    if (!previous) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })

    let ownerTransfer: { previousOwnerId: string | null; newOwnerId: string; reason: string } | null = null
    if (typeof body.owner_profile_id === 'string' && body.owner_profile_id !== previous.owner_profile_id) {
      const { data: owner } = await adminSupabase.from('profiles').select('id').eq('id', body.owner_profile_id).eq('organization_id', id).neq('role', 'staff').maybeSingle()
      if (!owner) return NextResponse.json({ error: 'The selected owner must be an account user in this organization.' }, { status: 400 })
      const reason = typeof body.transfer_reason === 'string' ? body.transfer_reason.trim().slice(0, 500) : ''
      if (reason.length < 8) return NextResponse.json({ error: 'Enter an ownership transfer reason of at least 8 characters.' }, { status: 400 })
      update.owner_profile_id = owner.id
      ownerTransfer = { previousOwnerId: previous.owner_profile_id, newOwnerId: owner.id, reason }
    }

    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No supported changes supplied.' }, { status: 400 })
    const { data: organization, error } = await adminSupabase.from('organizations').update(update).eq('id', id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (ownerTransfer) {
      const { error: transferError } = await adminSupabase.from('organization_owner_transfers').insert({ organization_id: id, previous_owner_profile_id: ownerTransfer.previousOwnerId, new_owner_profile_id: ownerTransfer.newOwnerId, transferred_by_profile_id: access.id, reason: ownerTransfer.reason })
      if (transferError) console.error('Owner transfer history error:', transferError)
    }
    await adminSupabase.from('audit_logs').insert({ organization_id: id, actor_profile_id: access.id, action_type: 'portal_customer_lifecycle_updated', entity_type: 'organization', entity_id: id, metadata: { previous, changes: update, actor_role: access.role, module: 'Platform Portal', page: '/portal' } })
    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Portal lifecycle update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
