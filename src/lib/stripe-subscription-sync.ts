import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isBillingPlanKey, type BillingPlanKey } from '@/lib/billing-plans'

type SupabaseAdmin = Pick<SupabaseClient, 'from'>

const PAID_ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due'])

function stripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null
}

function planForPrice(priceId: string | null | undefined): BillingPlanKey | null {
  if (!priceId) return null
  const prices: Partial<Record<BillingPlanKey, string | undefined>> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    growth: process.env.STRIPE_GROWTH_PRICE_ID,
    scale: process.env.STRIPE_SCALE_PRICE_ID,
  }
  return (Object.entries(prices).find(([, id]) => id === priceId)?.[0] as BillingPlanKey | undefined) ?? null
}

export function getSubscriptionPlan(subscription: Stripe.Subscription): BillingPlanKey | null {
  const pricePlan = planForPrice(subscription.items.data[0]?.price?.id)
  if (pricePlan) return pricePlan

  const metadataPlan = subscription.metadata.plan
  return metadataPlan && isBillingPlanKey(metadataPlan) && metadataPlan !== 'free'
    ? metadataPlan
    : null
}

export async function syncStripeSubscription(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription,
  organizationIdFallback?: string | null
) {
  const organizationId = subscription.metadata.organization_id || organizationIdFallback || null
  const plan = getSubscriptionPlan(subscription)
  if (!organizationId) throw new Error(`Stripe subscription ${subscription.id} has no organization`)
  if (!plan) throw new Error(`Stripe subscription ${subscription.id} has no recognized price or plan`)

  const periodEnd = subscription.items.data[0]?.current_period_end
  const record = {
    organization_id: organizationId,
    provider: 'stripe',
    provider_customer_id: stripeId(subscription.customer),
    provider_subscription_id: subscription.id,
    status: subscription.status,
    plan,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }

  const { data: existing, error: lookupError } = await supabase
    .from('organization_subscriptions')
    .select('id')
    .eq('provider', 'stripe')
    .eq('provider_subscription_id', subscription.id)
    .maybeSingle()
  if (lookupError) throw new Error(`Subscription lookup failed: ${lookupError.message}`)

  let write = existing
    ? await supabase.from('organization_subscriptions').update(record).eq('id', existing.id).select('id').single()
    : await supabase.from('organization_subscriptions').insert(record).select('id').single()
  if (write.error?.message.includes('cancel_at_period_end')) {
    const legacyRecord = {
      organization_id: record.organization_id,
      provider: record.provider,
      provider_customer_id: record.provider_customer_id,
      provider_subscription_id: record.provider_subscription_id,
      status: record.status,
      plan: record.plan,
      current_period_end: record.current_period_end,
    }
    write = existing
      ? await supabase.from('organization_subscriptions').update(legacyRecord).eq('id', existing.id).select('id').single()
      : await supabase.from('organization_subscriptions').insert(legacyRecord).select('id').single()
  }
  if (write.error) throw new Error(`Subscription sync failed: ${write.error.message}`)

  const effectivePlan = PAID_ACCESS_STATUSES.has(subscription.status) ? plan : 'free'
  const organizationUpdate = await supabase
    .from('organizations')
    .update({ plan: effectivePlan, billing_provider: 'stripe' })
    .eq('id', organizationId)
    .select('id')
    .single()
  if (organizationUpdate.error) throw new Error(`Organization plan sync failed: ${organizationUpdate.error.message}`)

  return { organizationId, plan: effectivePlan, record: { id: write.data.id, ...record } }
}
