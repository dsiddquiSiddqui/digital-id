import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'

type Check = {
  key: string
  title: string
  status: 'ready' | 'warning' | 'missing'
  detail: string
  href: string
}

type OrganizationHealth = {
  logo_url?: string | null
  favicon_url?: string | null
  background_image_url?: string | null
  id_card_template?: unknown
  require_2fa?: boolean | null
  ip_allowlist?: unknown[] | null
  backup_policy?: { frequency?: string | null } | null
  compliance_policy?: {
    require_document_approval?: boolean | null
    allow_staff_self_service?: boolean | null
  } | null
  plan?: string | null
}

function check(key: string, title: string, ready: boolean, warning: boolean, detail: string, href: string): Check {
  return {
    key,
    title,
    status: ready ? 'ready' : warning ? 'warning' : 'missing',
    detail,
    href,
  }
}

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const organizationId = result.access.profile.organization_id!
    const supabase = result.access.adminSupabase

    const [
      usage,
      organizationResult,
      domainsResult,
      automationsResult,
      batchesResult,
      emailLogsResult,
      exportRequestsResult,
      notificationsResult,
      renewalRequestsResult,
      auditLogsResult,
      tasksResult,
      invoicesResult,
      sessionsResult,
      jobsResult,
    ] = await Promise.all([
      getOrganizationPlanUsage(supabase, organizationId),
      supabase
        .from('organizations')
        .select('logo_url, favicon_url, background_image_url, id_card_template, require_2fa, ip_allowlist, backup_policy, compliance_policy, plan')
        .eq('id', organizationId)
        .single(),
      supabase.from('organization_domains').select('*').eq('organization_id', organizationId),
      supabase.from('workflow_automation_rules').select('*').eq('organization_id', organizationId),
      supabase.from('bulk_action_batches').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20),
      supabase.from('email_delivery_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20),
      supabase.from('export_requests').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20),
      supabase.from('notifications').select('*').eq('organization_id', organizationId).limit(20),
      supabase.from('staff_document_renewal_requests').select('*').eq('organization_id', organizationId).limit(20),
      supabase.from('audit_logs').select('*').eq('organization_id', organizationId).limit(20),
      supabase.from('admin_tasks').select('*').eq('organization_id', organizationId).limit(20),
      supabase.from('billing_invoices').select('*').eq('organization_id', organizationId).limit(20),
      supabase.from('session_activity').select('*').eq('organization_id', organizationId).limit(20),
      supabase.from('scheduled_jobs').select('*').limit(20),
    ])

    const org = (organizationResult.data || {}) as OrganizationHealth
    const domains = domainsResult.data || []
    const automations = automationsResult.data || []
    const batches = batchesResult.data || []
    const emailLogs = emailLogsResult.data || []
    const exports = exportRequestsResult.data || []
    const notifications = notificationsResult.data || []
    const renewals = renewalRequestsResult.data || []
    const auditLogs = auditLogsResult.data || []
    const tasks = tasksResult.data || []
    const invoices = invoicesResult.data || []
    const sessions = sessionsResult.data || []
    const jobs = jobsResult.data || []
    const verifiedDomains = domains.filter((domain) => domain.status === 'verified')
    const failedEmails = emailLogs.filter((email) => email.status === 'failed')
    const completedBatches = batches.filter((batch) => batch.status === 'completed')
    const rollbackReady = completedBatches.some((batch) => batch.rollback_until && !batch.rolled_back_at)

    const checks: Check[] = [
      check('domains', 'Real custom domain verification', verifiedDomains.length > 0, domains.length > 0, `${verifiedDomains.length}/${domains.length} domain(s) verified.`, '/custom-domains'),
      check('branding', 'White-label branding coverage', Boolean(org.logo_url && org.favicon_url && org.background_image_url), Boolean(org.logo_url || org.favicon_url || org.background_image_url), 'Logo, favicon, and background are checked here.', '/settings'),
      check('id_designer', 'ID card designer v2 foundation', Boolean(org.id_card_template), false, org.id_card_template ? 'Template configured.' : 'Create a card template.', '/id-card-designer'),
      check('bulk_safety', 'Bulk action safety', rollbackReady, completedBatches.length > 0, `${completedBatches.length} completed batch(es), rollback ${rollbackReady ? 'available' : 'not available'}.`, '/bulk-actions'),
      check('automation_builder', 'Automation builder v2', automations.length >= 2, automations.length > 0, `${automations.length} automation rule(s) configured.`, '/automations'),
      check('super_admin', 'Super admin controls', auditLogs.length > 0, false, 'Portal impersonation and audit logging are active when audit rows exist.', '/audit-logs'),
      check('import_export', 'Data import and export', exports.length > 0, usage.usage.staff > 0, `${exports.length} export request(s) found.`, '/reports'),
      check('notifications', 'Notification center', notifications.length > 0, false, `${notifications.length} recent notification(s).`, '/notifications'),
      check('document_compliance', 'Document compliance workflow', Boolean(org.compliance_policy?.require_document_approval), renewals.length > 0, `${renewals.length} renewal request(s), approval policy ${org.compliance_policy?.require_document_approval ? 'on' : 'off'}.`, '/document-renewals'),
      check('security', 'Security hardening', Boolean(org.require_2fa && sessions.length > 0), Boolean(org.require_2fa || sessions.length > 0 || org.ip_allowlist?.length), `2FA ${org.require_2fa ? 'on' : 'off'}, ${sessions.length} session record(s).`, '/security-center'),
      check('onboarding', 'Admin onboarding', Boolean(org.logo_url && usage.usage.staff > 0 && automations.length > 0), usage.usage.staff > 0, 'Branding, first staff, and automation are the core setup markers.', '/setup-wizard'),
      check('reliability', 'Reliability and ops', failedEmails.length === 0 && emailLogs.length > 0 && jobs.length > 0, emailLogs.length > 0 || Boolean(org.backup_policy) || jobs.length > 0, `${failedEmails.length} failed email(s), ${jobs.length} scheduled job(s), backup ${org.backup_policy?.frequency || 'not set'}.`, '/scheduled-jobs'),
      check('billing', 'Billing polish', invoices.length > 0 || org.plan !== 'free', org.plan !== 'free', `${invoices.length} invoice(s), package ${org.plan || 'free'}.`, '/billing'),
      check('self_service', 'Staff self-service', Boolean(org.compliance_policy?.allow_staff_self_service), false, org.compliance_policy?.allow_staff_self_service ? 'Staff self-service is allowed.' : 'Enable staff self-service.', '/security-center'),
      check('audit_approvals', 'Audit and approvals', auditLogs.length > 0 && batches.some((batch) => batch.approval_status), auditLogs.length > 0, `${auditLogs.length} audit row(s), ${tasks.length} admin task(s).`, '/audit-logs'),
    ]

    const score = Math.round((checks.filter((item) => item.status === 'ready').length / checks.length) * 100)

    return NextResponse.json({
      score,
      checks,
      metrics: {
        users: usage.usage.users,
        staff: usage.usage.staff,
        ids: usage.usage.ids,
        domains: domains.length,
        automations: automations.length,
        failed_emails: failedEmails.length,
        exports: exports.length,
        scheduled_jobs: jobs.length,
      },
    })
  } catch (error) {
    console.error('Enterprise health error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
