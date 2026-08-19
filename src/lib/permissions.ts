import type { AdminAccess } from '@/lib/admin-auth'

export const ROLE_PERMISSION_DEFAULTS: Record<string, Record<string, boolean>> = {
  super_admin: {
    view_staff: true,
    edit_staff: true,
    manage_documents: true,
    approve_documents: true,
    view_reports: true,
    manage_users: true,
    view_audit: true,
    manage_imports: true,
    manage_settings: true,
  },
  admin: {
    view_staff: true,
    edit_staff: true,
    manage_documents: true,
    approve_documents: true,
    view_reports: true,
    manage_users: true,
    view_audit: true,
    manage_imports: true,
    manage_settings: true,
  },
  manager: {
    view_staff: true,
    edit_staff: true,
    manage_documents: true,
    approve_documents: true,
    view_reports: true,
    manage_imports: false,
  },
  hr_manager: {
    view_staff: true,
    edit_staff: true,
    manage_documents: true,
    approve_documents: true,
    view_reports: true,
    manage_imports: true,
  },
  hr: {
    view_staff: true,
    edit_staff: true,
    manage_documents: true,
    approve_documents: false,
    view_reports: false,
    manage_imports: true,
  },
  operation_manager: {
    view_staff: true,
    edit_staff: false,
    manage_documents: false,
    approve_documents: false,
    view_reports: true,
    manage_imports: false,
  },
  operation_team: {
    view_staff: true,
    edit_staff: false,
    manage_documents: false,
    approve_documents: false,
    view_reports: false,
    manage_imports: false,
  },
}

export async function hasPermission(access: AdminAccess, permission: string) {
  if (access.profile.role === 'super_admin') return true

  const { data: organization } = await access.adminSupabase
    .from('organizations')
    .select('role_permissions')
    .eq('id', access.profile.organization_id!)
    .single()

  const role = access.profile.role
  const saved = organization?.role_permissions?.[role]?.[permission]

  if (typeof saved === 'boolean') return saved

  return Boolean(ROLE_PERMISSION_DEFAULTS[role]?.[permission])
}

export async function requirePermission(access: AdminAccess, permission: string) {
  const allowed = await hasPermission(access, permission)
  return allowed ? null : `Missing permission: ${permission}.`
}
