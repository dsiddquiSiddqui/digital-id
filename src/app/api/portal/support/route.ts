import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const STATUSES = ['open', 'triaged', 'in_progress', 'waiting_on_customer', 'escalated', 'resolved', 'closed']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']

async function requirePortalAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, role, full_name, email, is_active, platform_role, platform_permissions').eq('auth_user_id', user.id).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) return null
  return profile
}

function canManage(profile: { platform_role: string | null; platform_permissions: unknown }) {
  const permissions = Array.isArray(profile.platform_permissions) ? profile.platform_permissions : []
  return ['owner', 'administrator', 'support_agent'].includes(profile.platform_role || 'administrator') || permissions.includes('support.manage')
}

export async function GET() {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    const admin = createAdminClient()
    const [{ data: tickets, error }, { data: agents }] = await Promise.all([
      admin.from('support_tickets').select('id, ticket_number, organization_id, created_by_profile_id, assigned_to_profile_id, subject, message, category, priority, status, response_summary, first_response_due_at, resolution_due_at, first_response_at, last_customer_response_at, last_agent_response_at, escalation_reason, resolved_at, created_at, updated_at, organization:organizations(id, name, slug), creator:profiles!support_tickets_created_by_profile_id_fkey(full_name, email), assignee:profiles!support_tickets_assigned_to_profile_id_fkey(full_name, email)').order('updated_at', { ascending: false }).limit(100),
      admin.from('profiles').select('id, full_name, email, platform_role, is_active').is('organization_id', null).eq('role', 'super_admin').eq('is_active', true).order('full_name'),
    ])
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const ids = (tickets || []).map((ticket) => ticket.id)
    const { data: messages, error: messageError } = ids.length ? await admin.from('support_ticket_messages').select('id, ticket_id, author_profile_id, author_type, visibility, message, created_at, author:profiles(full_name, email)').in('ticket_id', ids).order('created_at') : { data: [], error: null }
    if (messageError) return NextResponse.json({ error: messageError.message }, { status: 400 })
    const enriched = (tickets || []).map((ticket) => ({ ...ticket, messages: (messages || []).filter((message) => message.ticket_id === ticket.id) }))
    return NextResponse.json({ tickets: enriched, agents: agents || [], canManage: canManage(access) })
  } catch (error) {
    console.error('Portal support load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    if (!canManage(access)) return NextResponse.json({ error: 'Your portal role has read-only support access.' }, { status: 403 })
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id || body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Ticket and explicit confirmation are required.' }, { status: 400 })
    const update: Record<string, string | null> = {}
    if (typeof body.status === 'string' && STATUSES.includes(body.status)) update.status = body.status
    if (typeof body.priority === 'string' && PRIORITIES.includes(body.priority)) update.priority = body.priority
    if (typeof body.assigned_to_profile_id === 'string' || body.assigned_to_profile_id === null) update.assigned_to_profile_id = body.assigned_to_profile_id || null
    if (typeof body.response_summary === 'string') update.response_summary = body.response_summary.trim().slice(0, 2000) || null
    if (typeof body.escalation_reason === 'string') update.escalation_reason = body.escalation_reason.trim().slice(0, 1000) || null
    if (update.status === 'resolved' || update.status === 'closed') update.resolved_at = new Date().toISOString()
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No supported changes supplied.' }, { status: 400 })
    const admin = createAdminClient()
    const { data: ticket, error } = await admin.from('support_tickets').update(update).eq('id', id).select('id, ticket_number, organization_id, status, priority, assigned_to_profile_id, updated_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await admin.from('audit_logs').insert({ organization_id: ticket.organization_id, actor_profile_id: access.id, action_type: 'portal_support_ticket_updated', entity_type: 'support_ticket', entity_id: ticket.id, metadata: { changes: update, actor_name: access.full_name, module: 'Support Inbox', page: '/portal' } })
    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Portal support update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePortalAccess()
    if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    if (!canManage(access)) return NextResponse.json({ error: 'Your portal role has read-only support access.' }, { status: 403 })
    const body = await request.json()
    const ticketId = typeof body.ticket_id === 'string' ? body.ticket_id : ''
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : ''
    const visibility = body.visibility === 'internal' ? 'internal' : 'customer'
    if (!ticketId || message.length < 2) return NextResponse.json({ error: 'Ticket and message are required.' }, { status: 400 })
    const admin = createAdminClient()
    const { data: ticket } = await admin.from('support_tickets').select('id, organization_id, first_response_at').eq('id', ticketId).maybeSingle()
    if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
    const now = new Date().toISOString()
    const { data: entry, error } = await admin.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_profile_id: access.id, author_type: 'portal_agent', visibility, message }).select('id, ticket_id, author_profile_id, author_type, visibility, message, created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const ticketUpdate: Record<string, string> = { last_agent_response_at: now, first_response_at: ticket.first_response_at || now }
    if (visibility === 'customer') ticketUpdate.status = 'waiting_on_customer'
    await admin.from('support_tickets').update(ticketUpdate).eq('id', ticket.id)
    await admin.from('audit_logs').insert({ organization_id: ticket.organization_id, actor_profile_id: access.id, action_type: visibility === 'internal' ? 'portal_support_internal_note_added' : 'portal_support_customer_reply_sent', entity_type: 'support_ticket', entity_id: ticket.id, metadata: { actor_name: access.full_name, visibility, module: 'Support Inbox', page: '/portal' } })
    return NextResponse.json({ message: entry })
  } catch (error) {
    console.error('Portal support message error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
