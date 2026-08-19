import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const provider = process.env.BILLING_PROVIDER || 'manual'
    const signature = request.headers.get('stripe-signature') || request.headers.get('paddle-signature')
    const rawBody = await request.text()
    const payload = rawBody ? JSON.parse(rawBody) : {}

    if (process.env.BILLING_WEBHOOK_SECRET && !signature) {
      return NextResponse.json({ error: 'Missing webhook signature.' }, { status: 401 })
    }

    const organizationId =
      payload?.data?.object?.metadata?.organization_id ||
      payload?.data?.metadata?.organization_id ||
      payload?.organization_id ||
      null

    const eventType = payload?.type || payload?.event_type || 'billing_webhook'
    const providerEventId = payload?.id || payload?.event_id || null
    const supabase = createAdminClient()

    await supabase.from('billing_events').insert({
      organization_id: organizationId,
      provider,
      event_type: eventType,
      provider_event_id: providerEventId,
      status: 'received',
      payload,
    })

    if (organizationId && ['checkout.session.completed', 'subscription.updated', 'subscription.created'].includes(eventType)) {
      const plan = payload?.data?.object?.metadata?.plan || payload?.data?.metadata?.plan
      if (plan) {
        await supabase.from('organization_subscriptions').insert({
          organization_id: organizationId,
          provider,
          provider_customer_id: payload?.data?.object?.customer || null,
          provider_subscription_id: payload?.data?.object?.subscription || payload?.data?.object?.id || null,
          status: 'active',
          plan,
        })
        await supabase.from('organizations').update({ plan, billing_provider: provider }).eq('id', organizationId)
      }
    }

    if (organizationId && ['invoice.payment_failed', 'subscription.cancelled'].includes(eventType)) {
      await supabase.from('organization_subscriptions').insert({
        organization_id: organizationId,
        provider,
        status: eventType === 'invoice.payment_failed' ? 'past_due' : 'cancelled',
        plan: payload?.data?.object?.metadata?.plan || 'free',
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Billing webhook error:', error)
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
  }
}
