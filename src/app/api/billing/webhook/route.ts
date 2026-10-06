import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { isBillingPlanKey } from '@/lib/billing-plans'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

type SubscriptionRecord = {
  organization_id: string
  provider: 'stripe'
  provider_customer_id: string | null
  provider_subscription_id: string
  status: string
  plan: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

function stripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature error:', error)
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: existingEvent } = await supabase
      .from('billing_events')
      .select('id')
      .eq('provider', 'stripe')
      .eq('provider_event_id', event.id)
      .maybeSingle()

    if (existingEvent) return NextResponse.json({ received: true, duplicate: true })

    let organizationId: string | null = null
    let subscriptionRecord: SubscriptionRecord | null = null

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      organizationId = session.metadata?.organization_id || session.client_reference_id
      const plan = session.metadata?.plan
      const subscriptionId = stripeId(session.subscription)

      if (organizationId && subscriptionId && plan && isBillingPlanKey(plan)) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
        subscriptionRecord = {
          organization_id: organizationId,
          provider: 'stripe',
          provider_customer_id: stripeId(session.customer),
          provider_subscription_id: subscription.id,
          status: subscription.status,
          plan,
          current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object
      organizationId = subscription.metadata.organization_id || null
      const plan = subscription.metadata.plan

      if (organizationId && plan && isBillingPlanKey(plan)) {
        subscriptionRecord = {
          organization_id: organizationId,
          provider: 'stripe',
          provider_customer_id: stripeId(subscription.customer),
          provider_subscription_id: subscription.id,
          status: subscription.status,
          plan,
          current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }
      }
    }

    if (subscriptionRecord) {
      const { data: existingSubscription } = await supabase
        .from('organization_subscriptions')
        .select('id')
        .eq('provider', 'stripe')
        .eq('provider_subscription_id', subscriptionRecord.provider_subscription_id)
        .maybeSingle()

      if (existingSubscription) {
        await supabase.from('organization_subscriptions').update(subscriptionRecord).eq('id', existingSubscription.id)
      } else {
        await supabase.from('organization_subscriptions').insert(subscriptionRecord)
      }

      const active = ['active', 'trialing'].includes(subscriptionRecord.status)
      await supabase
        .from('organizations')
        .update({ plan: active ? subscriptionRecord.plan : 'free', billing_provider: 'stripe' })
        .eq('id', subscriptionRecord.organization_id)
    }

    await supabase.from('billing_events').insert({
      organization_id: organizationId,
      provider: 'stripe',
      event_type: event.type,
      provider_event_id: event.id,
      status: 'processed',
      payload: event,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
