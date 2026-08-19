import { NextResponse } from 'next/server'
import { MANAGER_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'

const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent']
const VALID_STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']

function cleanText(value: unknown, limit = 3000) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

export async function GET() {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data, error } = await result.access.adminSupabase
      .from('support_tickets')
      .select('id, ticket_number, subject, category, priority, status, message, response_summary, created_at, updated_at, created_by:profiles(full_name, email)')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ tickets: data || [] })
  } catch (error) {
    console.error('Support tickets load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const subject = cleanText(body.subject, 160)
    const message = cleanText(body.message)
    const category = cleanText(body.category, 80) || 'general'
    const priority = VALID_PRIORITIES.includes(body.priority) ? body.priority : 'normal'

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 })
    }

    const { data, error } = await result.access.adminSupabase
      .from('support_tickets')
      .insert({
        organization_id: result.access.profile.organization_id,
        created_by_profile_id: result.access.profile.id,
        subject,
        message,
        category,
        priority,
      })
      .select('id, ticket_number, subject, category, priority, status, message, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAuditLog({
      access: result.access,
      action: 'create_support_ticket',
      entityType: 'support_ticket',
      entityId: data.id,
      module: 'Support',
      page: '/help',
      metadata: { subject, category, priority },
    })

    return NextResponse.json({ ticket: data })
  } catch (error) {
    console.error('Support ticket create error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const id = cleanText(body.id, 80)
    const status = VALID_STATUSES.includes(body.status) ? body.status : ''

    if (!id || !status) {
      return NextResponse.json({ error: 'Ticket id and valid status are required.' }, { status: 400 })
    }

    const update: Record<string, string> = { status }
    if (status === 'resolved' || status === 'closed') update.resolved_at = new Date().toISOString()

    const { data, error } = await result.access.adminSupabase
      .from('support_tickets')
      .update(update)
      .eq('id', id)
      .eq('organization_id', result.access.profile.organization_id!)
      .select('id, ticket_number, subject, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAuditLog({
      access: result.access,
      action: 'update_support_ticket',
      entityType: 'support_ticket',
      entityId: data.id,
      module: 'Support',
      page: '/help',
      metadata: { status },
    })

    return NextResponse.json({ ticket: data })
  } catch (error) {
    console.error('Support ticket update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
