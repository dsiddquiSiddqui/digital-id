import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getBillingPlan, isBillingPlanKey } from '@/lib/billing-plans'

const ADMIN_ROLES = ['super_admin', 'admin']

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, organization_id, role, full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (
      !currentProfile ||
      !currentProfile.organization_id ||
      !ADMIN_ROLES.includes(currentProfile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await request.json()
    const planKey = typeof body.plan === 'string' ? body.plan : ''

    if (!isBillingPlanKey(planKey)) {
      return NextResponse.json(
        { error: 'Invalid billing package.' },
        { status: 400 }
      )
    }

    const plan = getBillingPlan(planKey)

    const { data: updatedOrganization, error: updateError } =
      await adminSupabase
        .from('organizations')
        .update({ plan: plan.key })
        .eq('id', currentProfile.organization_id)
        .select(
          'id, name, slug, status, plan, logo_url, favicon_url, background_image_url, theme_key, primary_color, accent_color, surface_color'
        )
        .single()

    if (updateError || !updatedOrganization) {
      return NextResponse.json(
        { error: updateError?.message || 'Unable to update package.' },
        { status: 400 }
      )
    }

    const { data: existingSubscription } = await adminSupabase
      .from('organization_subscriptions')
      .select('id')
      .eq('organization_id', currentProfile.organization_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSubscription) {
      await adminSupabase
        .from('organization_subscriptions')
        .update({ plan: plan.key, status: 'active' })
        .eq('id', existingSubscription.id)
    } else {
      await adminSupabase.from('organization_subscriptions').insert({
        organization_id: currentProfile.organization_id,
        provider: 'manual',
        plan: plan.key,
        status: 'active',
      })
    }

    await adminSupabase.from('audit_logs').insert({
      organization_id: currentProfile.organization_id,
      actor_profile_id: currentProfile.id,
      action_type: 'organization_package_changed',
      entity_type: 'organization',
      entity_id: currentProfile.organization_id,
      metadata: {
        actor_name: currentProfile.full_name || user.email || 'Unknown user',
        actor_email: currentProfile.email || user.email || null,
        actor_role: currentProfile.role,
        module: 'Organization Settings',
        page: '/settings',
        changes: {
          plan: plan.key,
          plan_name: plan.name,
          user_limit: plan.userLimit,
          staff_limit: plan.staffLimit,
        },
      },
    })

    return NextResponse.json({
      success: true,
      organization: updatedOrganization,
    })
  } catch (error) {
    console.error('Organization package update error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
