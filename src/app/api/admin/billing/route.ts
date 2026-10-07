import { NextResponse } from 'next/server'
import { requireAdminAccess, ADMIN_ROLES } from '@/lib/admin-auth'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'
import { getStripe } from '@/lib/stripe'
import { syncStripeSubscription } from '@/lib/stripe-subscription-sync'

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const organizationId = result.access.profile.organization_id!
    const { data: storedSubscription, error: subscriptionError } = await result.access.adminSupabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (subscriptionError) throw subscriptionError

    let subscription = storedSubscription
    if (storedSubscription?.provider_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const stripeSubscription = await getStripe().subscriptions.retrieve(
        storedSubscription.provider_subscription_id
      )
      const synced = await syncStripeSubscription(
        result.access.adminSupabase,
        stripeSubscription,
        organizationId
      )
      subscription = synced.record
    }

    const planUsage = await getOrganizationPlanUsage(
      result.access.adminSupabase,
      organizationId
    )

    return NextResponse.json({ ...planUsage, subscription: subscription || null })
  } catch (error) {
    console.error('Billing load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
