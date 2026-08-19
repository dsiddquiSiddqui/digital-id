import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getTheme, type ThemeKey } from '@/lib/saas-themes'
import { getBillingPlan } from '@/lib/billing-plans'

export type Organization = {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  theme_key: ThemeKey
  logo_url: string | null
  favicon_url: string | null
  background_image_url: string | null
  primary_color: string
  accent_color: string
  surface_color: string
}

export type TenantProfile = {
  id: string
  organization_id: string | null
  auth_user_id: string | null
  role: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
  organizations?: Organization | null
}

export type TenantContext = {
  userId: string
  profile: TenantProfile
  organization: Organization | null
  organizationId: string | null
}

export function slugifyOrganizationName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return slug || 'organization'
}

async function createUniqueOrganizationSlug(name: string) {
  const supabase = createAdminClient()
  const baseSlug = slugifyOrganizationName(name)

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`

    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!data) {
      return slug
    }
  }

  return `${baseSlug}-${Date.now()}`
}

export async function createOrganizationWithOwner(input: {
  organizationName: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  phone?: string | null
  themeKey: string
  planKey: string
}) {
  const supabase = createAdminClient()
  const theme = getTheme(input.themeKey)
  const plan = getBillingPlan(input.planKey)
  const slug = await createUniqueOrganizationSlug(input.organizationName)

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', input.ownerEmail)
    .maybeSingle()

  if (existingProfile) {
    throw new Error('A user profile already exists with this email.')
  }

  const { data: authResult, error: authError } =
    await supabase.auth.admin.createUser({
      email: input.ownerEmail,
      password: input.ownerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.ownerName,
        role: 'admin',
        organization_slug: slug,
      },
    })

  if (authError || !authResult.user) {
    throw new Error(authError?.message || 'Failed to create owner login.')
  }

  const authUserId = authResult.user.id
  let organizationId: string | null = null
  let profileId: string | null = null

  try {
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .insert({
        name: input.organizationName,
        slug,
        plan: plan.key,
        theme_key: theme.key,
        primary_color: theme.primaryColor,
        accent_color: theme.accentColor,
        surface_color: theme.surfaceColor,
      })
      .select('id, slug')
      .single()

    if (organizationError || !organization) {
      throw new Error(
        organizationError?.message || 'Failed to create organization.'
      )
    }

    organizationId = organization.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        organization_id: organization.id,
        auth_user_id: authUserId,
        role: 'admin',
        full_name: input.ownerName,
        email: input.ownerEmail,
        phone: input.phone || null,
        is_active: true,
      })
      .select('id')
      .single()

    if (profileError || !profile) {
      throw new Error(profileError?.message || 'Failed to create owner profile.')
    }

    profileId = profile.id

    await supabase.from('organization_subscriptions').insert({
      organization_id: organization.id,
      plan: plan.key,
      status: 'trialing',
    })

    await supabase.from('audit_logs').insert({
      organization_id: organization.id,
      actor_profile_id: profile.id,
      action_type: 'organization_created',
      entity_type: 'organization',
      entity_id: organization.id,
      metadata: {
        organization_name: input.organizationName,
        owner_email: input.ownerEmail,
        theme_key: theme.key,
        plan: plan.key,
      },
    })

    return {
      organizationId: organization.id,
      profileId: profile.id,
      authUserId,
      slug: organization.slug,
    }
  } catch (error) {
    if (profileId) {
      await supabase.from('profiles').delete().eq('id', profileId)
    }

    if (organizationId) {
      await supabase.from('organizations').delete().eq('id', organizationId)
    }

    await supabase.auth.admin.deleteUser(authUserId)

    throw error
  }
}

export async function getCurrentTenant(): Promise<TenantContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, organization_id, auth_user_id, role, full_name, email, phone, is_active, organizations:organizations(id, name, slug, status, plan, theme_key, logo_url, favicon_url, background_image_url, primary_color, accent_color, surface_color)'
    )
    .eq('auth_user_id', user.id)
    .single<TenantProfile>()

  if (error || !profile || profile.is_active === false) {
    return null
  }

  return {
    userId: user.id,
    profile,
    organization: profile.organizations ?? null,
    organizationId: profile.organization_id,
  }
}

export function canManageStaff(role: string) {
  return [
    'super_admin',
    'admin',
    'manager',
    'hr_manager',
    'hr',
    'operation_manager',
  ].includes(role)
}

export function canManageUsers(role: string) {
  return ['super_admin', 'admin'].includes(role)
}

export function canViewAuditLogs(role: string) {
  return ['super_admin', 'admin'].includes(role)
}
