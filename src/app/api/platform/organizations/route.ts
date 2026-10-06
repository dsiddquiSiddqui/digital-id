import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getBillingPlan, isBillingPlanKey } from '@/lib/billing-plans'

const PLATFORM_ROLES = ['super_admin']
const ORGANIZATION_STATUSES = ['active', 'trialing', 'paused', 'suspended', 'archived']

async function requirePlatformAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !PLATFORM_ROLES.includes(profile.role)) return null

  return { user, profile }
}

export async function GET() {
  try {
    const access = await requirePlatformAccess()

    if (!access) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    const { data: organizations, error } = await adminSupabase
      .from('organizations')
      .select('id, name, slug, status, plan, logo_url, favicon_url, background_image_url, theme_key, primary_color, accent_color, surface_color, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const rows = await Promise.all(
      (organizations || []).map(async (organization) => {
        const [users, staff, subscription] = await Promise.all([
          adminSupabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .neq('role', 'staff'),
          adminSupabase
            .from('staff')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id),
          adminSupabase
            .from('organization_subscriptions')
            .select('id, provider, status, plan, current_period_end, created_at')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        const plan = getBillingPlan(organization.plan)

        return {
          ...organization,
          billing_plan: plan,
          user_count: users.count || 0,
          staff_count: staff.count || 0,
          subscription: subscription.data || null,
        }
      })
    )

    return NextResponse.json({ organizations: rows })
  } catch (error) {
    console.error('Platform organizations load error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requirePlatformAccess()

    if (!access) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await request.json()
    const organizationId =
      typeof body.organization_id === 'string' ? body.organization_id : ''
    const status = typeof body.status === 'string' ? body.status : ''
    const plan = typeof body.plan === 'string' ? body.plan : ''

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required.' },
        { status: 400 }
      )
    }

    if (!ORGANIZATION_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid organization status.' },
        { status: 400 }
      )
    }

    if (!isBillingPlanKey(plan)) {
      return NextResponse.json(
        { error: 'Invalid billing plan.' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    const { data: organization, error: updateError } = await adminSupabase
      .from('organizations')
      .update({ status, plan })
      .eq('id', organizationId)
      .select('id, name, slug, status, plan')
      .single()

    if (updateError || !organization) {
      return NextResponse.json(
        { error: updateError?.message || 'Unable to update organization.' },
        { status: 400 }
      )
    }

    const { data: existingSubscription } = await adminSupabase
      .from('organization_subscriptions')
      .select('id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSubscription) {
      await adminSupabase
        .from('organization_subscriptions')
        .update({
          plan,
          status: status === 'suspended' || status === 'archived' ? 'inactive' : 'active',
        })
        .eq('id', existingSubscription.id)
    } else {
      await adminSupabase.from('organization_subscriptions').insert({
        organization_id: organizationId,
        provider: 'manual',
        plan,
        status: status === 'suspended' || status === 'archived' ? 'inactive' : 'active',
      })
    }

    await adminSupabase.from('audit_logs').insert({
      actor_profile_id: access.profile.id,
      action_type: 'platform_organization_updated',
      entity_type: 'organization',
      entity_id: organizationId,
      metadata: {
        actor_name: access.profile.full_name || access.user.email || 'Platform admin',
        actor_email: access.profile.email || access.user.email || null,
        actor_role: access.profile.role,
        module: 'Platform Organizations',
        page: '/platform/organizations',
        changes: { status, plan },
      },
    })

    return NextResponse.json({
      success: true,
      organization,
    })
  } catch (error) {
    console.error('Platform organization update error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
