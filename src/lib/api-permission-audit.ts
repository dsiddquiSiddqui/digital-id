export type ApiPermissionAuditItem = {
  area: string
  routes: string
  guard: string
  status: 'covered' | 'needs_review'
}

export const API_PERMISSION_AUDIT: readonly ApiPermissionAuditItem[] = [
  { area: 'Admin settings', routes: '/api/admin/organization-settings, /api/admin/security-center, /api/admin/role-permissions', guard: 'ADMIN_ROLES', status: 'covered' },
  { area: 'Billing', routes: '/api/admin/billing, checkout, portal', guard: 'ADMIN_ROLES', status: 'covered' },
  { area: 'Users and invitations', routes: '/api/admin/invite-user, create-user, update-user, reset-user-password', guard: 'Admin role + tenant-scoped targets + super-admin protection', status: 'covered' },
  { area: 'Staff operations', routes: '/api/admin/update-staff*, /api/v2/staff/*', guard: 'Manager role + tenant-scoped reads and mutations', status: 'covered' },
  { area: 'Bulk actions', routes: '/api/admin/bulk-actions', guard: 'MANAGER_ROLES + edit_staff', status: 'covered' },
  { area: 'Reports and exports', routes: '/api/admin/reports, /api/admin/exports', guard: 'MANAGER_ROLES/ADMIN_ROLES + view_reports', status: 'covered' },
  { area: 'Documents and renewals', routes: '/api/admin/document-renewals, /api/staff/document-renewals', guard: 'Manager tenant scope + staff profile ownership', status: 'covered' },
  { area: 'Custom domains', routes: '/api/admin/custom-domains', guard: 'ADMIN_ROLES', status: 'covered' },
  { area: 'Automations and jobs', routes: '/api/admin/automations, /api/admin/scheduled-jobs, /api/cron/*', guard: 'ADMIN_ROLES / CRON_SECRET', status: 'covered' },
  { area: 'Files', routes: '/api/files/[id]/signed-url, /api/admin/upload-photo', guard: 'Tenant-owned signed URLs + manager-only tenant-scoped uploads', status: 'covered' },
  { area: 'Platform super admin', routes: '/api/platform/organizations*', guard: 'Active super-admin session + audited workspace access', status: 'covered' },
  { area: 'Public verify/invite/legal', routes: '/api/invitations/*, /api/legal/accept, /api/portal/*', guard: 'Rate-limited token flow + authenticated profile or super-admin session', status: 'covered' },
]

export function permissionAuditSummary() {
  const covered = API_PERMISSION_AUDIT.filter((item) => item.status === 'covered').length
  const needsReview = API_PERMISSION_AUDIT.filter((item) => item.status === 'needs_review').length
  return { covered, needsReview, total: API_PERMISSION_AUDIT.length }
}
