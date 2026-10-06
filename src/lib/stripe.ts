import Stripe from 'stripe'
import type { BillingPlanKey } from '@/lib/billing-plans'

let stripeClient: Stripe | null = null

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured.')

  stripeClient ??= new Stripe(secretKey, { typescript: true })
  return stripeClient
}

export function getStripePriceId(plan: BillingPlanKey) {
  const priceIds: Partial<Record<BillingPlanKey, string | undefined>> = {
    free: process.env.STRIPE_FREE_PRICE_ID,
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    growth: process.env.STRIPE_GROWTH_PRICE_ID,
    scale: process.env.STRIPE_SCALE_PRICE_ID,
  }

  return priceIds[plan]
}
