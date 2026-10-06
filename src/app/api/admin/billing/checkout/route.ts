import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'
import { isBillingPlanKey } from '@/lib/billing-plans'
import { getStripe, getStripePriceId } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const plan = typeof body.plan === 'string' && isBillingPlanKey(body.plan) ? body.plan : ''
    if (!plan) {
      return NextResponse.json({ error: 'Choose a valid package.' }, { status: 400 })
    }

    if (plan === 'enterprise') {
      return NextResponse.json(
        { error: 'Contact sales for an Enterprise package.' },
        { status: 400 }
      )
    }

    if (plan === 'free') {
      return NextResponse.json(
        { error: 'The Free plan does not require Stripe. Cancel an active paid subscription to return to Free.' },
        { status: 400 }
      )
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured yet. Add the Stripe keys and recurring Price IDs to the application environment.' },
        { status: 503 }
      )
    }

    const priceId = getStripePriceId(plan)
    if (!priceId) {
      return NextResponse.json({ error: `Stripe price for ${plan} is not configured.` }, { status: 503 })
    }

    const organizationId = result.access.profile.organization_id!
    const { data: organization } = await result.access.adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()
    const { data: subscription } = await result.access.adminSupabase
      .from('organization_subscriptions')
      .select('provider_customer_id')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .not('provider_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
      client_reference_id: organizationId,
      ...(subscription?.provider_customer_id
        ? { customer: subscription.provider_customer_id }
        : { customer_email: result.access.user.email || undefined }),
      metadata: { organization_id: organizationId, plan },
      subscription_data: { metadata: { organization_id: organizationId, plan } },
    })

    await writeAuditLog({
      access: result.access,
      action: 'billing_checkout_started',
      entityType: 'organization',
      entityId: result.access.profile.organization_id,
      module: 'Billing',
      page: '/billing',
      metadata: { plan, provider: 'stripe', organization_name: organization?.name },
    })

    return NextResponse.json({ checkout_url: session.url })
  } catch (error) {
    console.error('Checkout start error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
