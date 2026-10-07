import { afterEach, describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { getSubscriptionPlan } from '@/lib/stripe-subscription-sync'

const originalStarterPrice = process.env.STRIPE_STARTER_PRICE_ID

afterEach(() => {
  process.env.STRIPE_STARTER_PRICE_ID = originalStarterPrice
})

function subscription(priceId: string, metadataPlan: string): Stripe.Subscription {
  return {
    metadata: { plan: metadataPlan },
    items: { data: [{ price: { id: priceId } }] },
  } as unknown as Stripe.Subscription
}

describe('Stripe subscription plan sync', () => {
  it('uses the current Stripe price when a portal change leaves old metadata', () => {
    process.env.STRIPE_STARTER_PRICE_ID = 'price_starter'
    expect(getSubscriptionPlan(subscription('price_starter', 'growth'))).toBe('starter')
  })

  it('falls back to valid subscription metadata when the price is unavailable', () => {
    expect(getSubscriptionPlan(subscription('price_unknown', 'growth'))).toBe('growth')
  })

  it('rejects free or unknown paid-subscription metadata', () => {
    expect(getSubscriptionPlan(subscription('price_unknown', 'free'))).toBeNull()
    expect(getSubscriptionPlan(subscription('price_unknown', 'not-a-plan'))).toBeNull()
  })
})
