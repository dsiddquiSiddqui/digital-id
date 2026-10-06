import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getBillingPlan } from '@/lib/billing-plans'

async function requirePortalAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin' || profile.is_active === false) {
    return null
  }

  return { user, profile }
}

export async function GET() {
  try {
    const access = await requirePortalAccess()

    if (!access) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    const [{ data: organizations }, { data: portalUsers }] = await Promise.all([
      adminSupabase
        .from('organizations')
        .select('id, name, slug, status, plan, created_at')
        .order('created_at', { ascending: false }),
      adminSupabase
        .from('profiles')
        .select('id, full_name, email, role, is_active, created_at')
        .is('organization_id', null)
        .eq('role', 'super_admin')
        .order('created_at', { ascending: false }),
    ])

    const organizationRows = await Promise.all(
      (organizations || []).map(async (organization) => {
        const [users, staff] = await Promise.all([
          adminSupabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .neq('role', 'staff'),
          adminSupabase
            .from('staff')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id),
        ])

        const billingPlan = getBillingPlan(organization.plan)

        return {
          ...organization,
          plan_name: billingPlan.name,
          monthly_price: billingPlan.monthlyPrice,
          user_limit: billingPlan.userLimit,
          staff_limit: billingPlan.staffLimit,
          user_count: users.count || 0,
          staff_count: staff.count || 0,
        }
      })
    )

    const activeOrganizations = organizationRows.filter((organization) =>
      ['active', 'trialing'].includes(organization.status)
    )
    const monthlyRevenue = activeOrganizations.reduce(
      (sum, organization) => sum + (organization.monthly_price || 0),
      0
    )

    return NextResponse.json({
      metrics: {
        organizations: organizationRows.length,
        activeOrganizations: activeOrganizations.length,
        suspendedOrganizations: organizationRows.filter(
          (organization) => organization.status === 'suspended'
        ).length,
        monthlyRevenue,
        annualRevenue: monthlyRevenue * 12,
        users: organizationRows.reduce(
          (sum, organization) => sum + organization.user_count,
          0
        ),
        staff: organizationRows.reduce(
          (sum, organization) => sum + organization.staff_count,
          0
        ),
      },
      organizations: organizationRows,
      portalUsers: portalUsers || [],
    })
  } catch (error) {
    console.error('Portal summary error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
