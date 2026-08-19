import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'

const TRIGGERS = ['document_expiring', 'staff_status_changed', 'id_expired', 'invite_pending']
const ACTIONS = ['create_notification', 'send_email', 'create_task']
type AutomationAction = { type: string; target?: string; message?: string }
const TEMPLATES = [
  {
    key: 'document_expiring_14',
    name: 'Document expires in 14 days',
    trigger_type: 'document_expiring',
    conditions: { days_before: 14 },
    actions: [{ type: 'create_notification', target: 'admins', message: 'A staff document expires within 14 days.' }],
  },
  {
    key: 'id_expired_alert',
    name: 'ID expired alert',
    trigger_type: 'id_expired',
    conditions: { days_before: 0 },
    actions: [{ type: 'create_notification', target: 'admins', message: 'A staff ID has expired and needs review.' }],
  },
  {
    key: 'invite_pending_3',
    name: 'Pending invite reminder',
    trigger_type: 'invite_pending',
    conditions: { days_before: 3 },
    actions: [{ type: 'send_email', target: 'admins', message: 'A user invitation is still pending after 3 days.' }],
  },
]

function cleanActions(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((action: unknown): action is AutomationAction => {
      if (!action || typeof action !== 'object' || !('type' in action)) return false
      return typeof action.type === 'string' && ACTIONS.includes(action.type)
    })
    .map((action) => ({
      type: action.type,
      target: typeof action.target === 'string' ? action.target : 'admins',
      message: typeof action.message === 'string' ? action.message.slice(0, 240) : '',
    }))
}

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const { data: rules } = await result.access.adminSupabase
      .from('workflow_automation_rules')
      .select('*')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('created_at', { ascending: false })

    const { data: runs } = await result.access.adminSupabase
      .from('workflow_automation_runs')
      .select('*')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ rules: rules || [], runs: runs || [], templates: TEMPLATES })
  } catch (error) {
    console.error('Automations load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    if (body.action === 'test') {
      const ruleId = typeof body.id === 'string' ? body.id : ''
      const { data: rule, error: ruleError } = await result.access.adminSupabase
        .from('workflow_automation_rules')
        .select('*')
        .eq('id', ruleId)
        .eq('organization_id', result.access.profile.organization_id!)
        .single()

      if (ruleError || !rule) return NextResponse.json({ error: 'Automation rule not found.' }, { status: 404 })

      let matchedCount = 0
      if (rule.trigger_type === 'document_expiring') {
        const days = Number(rule.conditions?.days_before || 14)
        const target = new Date()
        target.setDate(target.getDate() + days)
        const { count } = await result.access.adminSupabase
          .from('staff_documents')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', result.access.profile.organization_id!)
          .not('expiry_date', 'is', null)
          .lte('expiry_date', target.toISOString().slice(0, 10))
        matchedCount = count || 0
      } else if (rule.trigger_type === 'invite_pending') {
        const { count } = await result.access.adminSupabase
          .from('user_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', result.access.profile.organization_id!)
          .eq('status', 'pending')
        matchedCount = count || 0
      } else if (rule.trigger_type === 'id_expired') {
        const { count } = await result.access.adminSupabase
          .from('staff_ids')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', result.access.profile.organization_id!)
          .eq('is_current', true)
          .lt('expiry_date', new Date().toISOString().slice(0, 10))
        matchedCount = count || 0
      }

      const { data: run } = await result.access.adminSupabase
        .from('workflow_automation_runs')
        .insert({
          organization_id: result.access.profile.organization_id,
          rule_id: rule.id,
          status: 'test_completed',
          matched_count: matchedCount,
          action_count: 0,
          metadata: { test: true, trigger_type: rule.trigger_type },
        })
        .select('*')
        .single()

      await result.access.adminSupabase
        .from('workflow_automation_rules')
        .update({ last_tested_at: new Date().toISOString() })
        .eq('id', rule.id)

      return NextResponse.json({ run, matched_count: matchedCount })
    }

    const template = typeof body.template_key === 'string' ? TEMPLATES.find((item) => item.key === body.template_key) : null
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : template?.name || ''
    const triggerType = TRIGGERS.includes(body.trigger_type) ? body.trigger_type : template?.trigger_type || ''
    const conditions = body.conditions && typeof body.conditions === 'object' ? body.conditions : template?.conditions || {}
    const actions = cleanActions(body.actions || template?.actions)

    if (!name || !triggerType || actions.length === 0) {
      return NextResponse.json({ error: 'Name, trigger, and at least one action are required.' }, { status: 400 })
    }

    const { data, error } = await result.access.adminSupabase
      .from('workflow_automation_rules')
      .insert({
        organization_id: result.access.profile.organization_id,
        name,
        description: typeof body.description === 'string' ? body.description.trim() : null,
        trigger_type: triggerType,
        conditions,
        actions,
        is_active: body.is_active !== false,
        created_by: result.access.profile.id,
        template_key: template?.key || null,
        delay_minutes: Number.isFinite(Number(body.delay_minutes)) ? Math.max(0, Math.round(Number(body.delay_minutes))) : 0,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAuditLog({
      access: result.access,
      action: 'automation_rule_created',
      entityType: 'workflow_automation_rule',
      entityId: data.id,
      module: 'Automations',
      page: '/automations',
      metadata: { name, trigger_type: triggerType },
    })

    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('Automation create error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''

    const { data, error } = await result.access.adminSupabase
      .from('workflow_automation_rules')
      .update({ is_active: Boolean(body.is_active) })
      .eq('id', id)
      .eq('organization_id', result.access.profile.organization_id!)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('Automation update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
