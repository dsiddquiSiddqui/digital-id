import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type AdminProfile = {
  id: string
  auth_user_id?: string | null
  organization_id: string | null
  role: string
  full_name: string | null
  email: string | null
}

export type AdminAccess = {
  user: {
    id: string
    email?: string | null
  }
  profile: AdminProfile
  adminSupabase: ReturnType<typeof createAdminClient>
}

export const ADMIN_ROLES = ['super_admin', 'admin']
export const MANAGER_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'hr_manager',
  'hr',
  'operation_manager',
]

export async function requireAdminAccess(allowedRoles = ADMIN_ROLES) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: 'Unauthorized.',
      status: 401 as const,
      access: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, auth_user_id, organization_id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .single<AdminProfile>()

  if (!profile || !allowedRoles.includes(profile.role)) {
    return {
      error: 'Forbidden.',
      status: 403 as const,
      access: null,
    }
  }

  if (!profile.organization_id) {
    return {
      error: 'No organization is selected.',
      status: 400 as const,
      access: null,
    }
  }

  return {
    error: null,
    status: 200 as const,
    access: {
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      adminSupabase,
    } satisfies AdminAccess,
  }
}

export function actorMetadata(access: AdminAccess) {
  return {
    actor_name:
      access.profile.full_name || access.user.email || 'Unknown user',
    actor_email: access.profile.email || access.user.email || null,
    actor_role: access.profile.role,
  }
}
