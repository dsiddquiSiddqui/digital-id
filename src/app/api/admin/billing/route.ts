import { NextResponse } from 'next/server'
import { requireAdminAccess, ADMIN_ROLES } from '@/lib/admin-auth'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'
import { getStripe } from '@/lib/stripe'

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const organizationId = result.access.profile.organization_id!
    const planUsage = await getOrganizationPlanUsage(
      result.access.adminSupabase,
      organizationId
    )

    const { data: storedSubscription } = await result.access.adminSupabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let subscription = storedSubscription
    if (storedSubscription?.provider_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeSubscription = await getStripe().subscriptions.retrieve(
          storedSubscription.provider_subscription_id
        )
        const periodEnd = stripeSubscription.items.data[0]?.current_period_end
        const refreshedSubscription = {
          ...storedSubscription,
          status: stripeSubscription.status,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : storedSubscription.current_period_end,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        }

        subscription = refreshedSubscription
        await result.access.adminSupabase
          .from('organization_subscriptions')
          .update({
            status: refreshedSubscription.status,
            current_period_end: refreshedSubscription.current_period_end,
            cancel_at_period_end: refreshedSubscription.cancel_at_period_end,
          })
          .eq('id', storedSubscription.id)
      } catch (error) {
        console.error('Stripe subscription refresh error:', error)
      }
    }

    return NextResponse.json({
      ...planUsage,
      subscription: subscription || null,
    })
  } catch (error) {
    console.error('Billing load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
