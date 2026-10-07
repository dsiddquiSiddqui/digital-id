export const SYSTEM_USER_ROLES = [
  'super_admin',
  'admin',
  'hr_manager',
  'hr',
  'operation_manager',
  'operation_team',
] as const

export type SystemUserRole = (typeof SYSTEM_USER_ROLES)[number]

export function isSystemUserRole(role: string): role is SystemUserRole {
  return SYSTEM_USER_ROLES.some((allowedRole) => allowedRole === role)
}
