import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const organizationId = result.access.profile.organization_id!
    const { data: subscription } = await result.access.adminSupabase
      .from('organization_subscriptions')
      .select('id, provider_subscription_id, status')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .not('provider_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription?.provider_subscription_id || ['canceled', 'cancelled', 'incomplete_expired'].includes(subscription.status)) {
      return NextResponse.json({ error: 'There is no active paid subscription to cancel.' }, { status: 400 })
    }

    const stripeSubscription = await getStripe().subscriptions.update(
      subscription.provider_subscription_id,
      { cancel_at_period_end: true }
    )
    const periodEnd = stripeSubscription.items.data[0]?.current_period_end
    const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

    await result.access.adminSupabase
      .from('organization_subscriptions')
      .update({
        status: stripeSubscription.status,
        cancel_at_period_end: true,
        current_period_end: currentPeriodEnd,
      })
      .eq('id', subscription.id)

    await writeAuditLog({
      access: result.access,
      action: 'billing_subscription_cancel_scheduled',
      entityType: 'organization_subscription',
      entityId: subscription.id,
      module: 'Billing',
      page: '/billing',
      metadata: { current_period_end: currentPeriodEnd },
    })

    return NextResponse.json({
      message: currentPeriodEnd
        ? `Cancellation scheduled for ${currentPeriodEnd}.`
        : 'Cancellation scheduled for the end of the billing period.',
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: true,
      status: stripeSubscription.status,
    })
  } catch (error) {
    console.error('Subscription cancellation error:', error)
    return NextResponse.json({ error: 'Unable to cancel the subscription.' }, { status: 500 })
  }
}
