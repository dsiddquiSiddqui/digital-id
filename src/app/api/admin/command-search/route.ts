import { NextResponse } from 'next/server'
import { MANAGER_ROLES, requireAdminAccess } from '@/lib/admin-auth'

const QUICK_ROUTES = [
  { label: 'Dashboard', href: '/dashboard', type: 'Page' },
  { label: 'Staff', href: '/v2/staff', type: 'Page' },
  { label: 'Bulk Actions', href: '/bulk-actions', type: 'Tool' },
  { label: 'ID Card Designer', href: '/id-card-designer', type: 'Tool' },
  { label: 'Custom Domains', href: '/custom-domains', type: 'Tool' },
  { label: 'Automations', href: '/automations', type: 'Tool' },
  { label: 'Enterprise Health', href: '/enterprise-health', type: 'Tool' },
  { label: 'Launch Checklist', href: '/launch-checklist', type: 'Tool' },
  { label: 'Email Templates', href: '/email-templates', type: 'Tool' },
  { label: 'Scheduled Jobs', href: '/scheduled-jobs', type: 'Ops' },
  { label: 'Permission Audit', href: '/permission-audit', type: 'Security' },
  { label: 'Production Readiness', href: '/production-readiness', type: 'Ops' },
  { label: 'Security Center', href: '/security-center', type: 'Security' },
  { label: 'Documentation and Support', href: '/help', type: 'Support' },
  { label: 'Support Tickets', href: '/help', type: 'Support' },
  { label: 'Setup Wizard', href: '/setup-wizard', type: 'Setup' },
  { label: 'Import History', href: '/imports', type: 'Tool' },
  { label: 'Staff Bulk Upload', href: '/v2/staff/bulk-upload', type: 'Tool' },
  { label: 'Invite User', href: '/users/invite', type: 'People' },
  { label: 'Role Permissions', href: '/settings/permissions', type: 'Settings' },
  { label: 'Reports', href: '/reports', type: 'Report' },
  { label: 'Audit Logs', href: '/audit-logs', type: 'Audit' },
  { label: 'Organization Settings', href: '/settings', type: 'Settings' },
]

export async function GET(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const url = new URL(request.url)
    const q = (url.searchParams.get('q') || '').trim().toLowerCase()
    const organizationId = result.access.profile.organization_id!

    const quick = QUICK_ROUTES.filter((route) => !q || route.label.toLowerCase().includes(q)).slice(0, 8)

    if (!q) {
      return NextResponse.json({ results: quick })
    }

    const [staffResult, profileResult] = await Promise.all([
      result.access.adminSupabase
        .from('staff')
        .select('id, full_name, employee_code, status')
        .eq('organization_id', organizationId)
        .or(`full_name.ilike.%${q}%,employee_code.ilike.%${q}%`)
        .limit(6),
      result.access.adminSupabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('organization_id', organizationId)
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(6),
    ])

    const staff = (staffResult.data || []).map((row) => ({
      label: row.full_name || row.employee_code,
      detail: `${row.employee_code || 'No code'} - ${row.status || 'unknown'}`,
      href: `/v2/staff/${row.id}`,
      type: 'Staff',
    }))

    const users = (profileResult.data || []).map((row) => ({
      label: row.full_name || row.email,
      detail: `${row.email || 'No email'} - ${(row.role || 'user').replace(/_/g, ' ')}`,
      href: `/users/${row.id}/edit`,
      type: 'User',
    }))

    return NextResponse.json({ results: [...quick, ...staff, ...users].slice(0, 12) })
  } catch (error) {
    console.error('Command search error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
