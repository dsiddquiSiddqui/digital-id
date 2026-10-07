import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { syncStripeSubscription } from '@/lib/stripe-subscription-sync'

export const runtime = 'nodejs'

function stripeId(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id ?? null
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const current = invoice as Stripe.Invoice & {
    parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } }
    subscription?: string | Stripe.Subscription | null
  }
  return stripeId(current.parent?.subscription_details?.subscription ?? current.subscription ?? null)
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
    const { data: existingEvent, error: eventLookupError } = await supabase
      .from('billing_events')
      .select('id')
      .eq('provider', 'stripe')
      .eq('provider_event_id', event.id)
      .maybeSingle()
    if (eventLookupError) throw new Error(`Billing event lookup failed: ${eventLookupError.message}`)
    if (existingEvent) return NextResponse.json({ received: true, duplicate: true })

    let organizationId: string | null = null
    let subscription: Stripe.Subscription | null = null

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object
      organizationId = session.metadata?.organization_id || session.client_reference_id
      const subscriptionId = stripeId(session.subscription)
      if (subscriptionId) subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      subscription = event.data.object
      organizationId = subscription.metadata.organization_id || null
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const subscriptionId = invoiceSubscriptionId(event.data.object)
      if (subscriptionId) subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    }

    if (subscription) {
      const synced = await syncStripeSubscription(supabase, subscription, organizationId)
      organizationId = synced.organizationId
    }

    const eventWrite = await supabase.from('billing_events').insert({
      organization_id: organizationId,
      provider: 'stripe',
      event_type: event.type,
      provider_event_id: event.id,
      status: 'processed',
      payload: event,
    })
    if (eventWrite.error) throw new Error(`Billing event write failed: ${eventWrite.error.message}`)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
