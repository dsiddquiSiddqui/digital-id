import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'
import { isBillingPlanKey } from '@/lib/billing-plans'

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const plan = typeof body.plan === 'string' && isBillingPlanKey(body.plan) ? body.plan : ''
    const provider = process.env.BILLING_PROVIDER || 'manual'

    if (!plan) {
      return NextResponse.json({ error: 'Choose a valid package.' }, { status: 400 })
    }

    if (provider === 'manual' || !process.env.BILLING_CHECKOUT_URL) {
      await result.access.adminSupabase.from('billing_events').insert({
        organization_id: result.access.profile.organization_id,
        provider: 'manual',
        event_type: 'checkout_requested',
        status: 'setup_required',
        payload: { plan },
      })

      await writeAuditLog({
        access: result.access,
        action: 'billing_checkout_requested',
        entityType: 'organization',
        entityId: result.access.profile.organization_id,
        module: 'Billing',
        page: '/billing',
        metadata: { plan, provider: 'manual' },
      })

      return NextResponse.json({
        setup_required: true,
        message: 'Billing provider is not configured. Add Stripe/Paddle checkout integration credentials.',
      })
    }

    const checkoutUrl = `${process.env.BILLING_CHECKOUT_URL}?org=${result.access.profile.organization_id}&plan=${plan}`

    await writeAuditLog({
      access: result.access,
      action: 'billing_checkout_started',
      entityType: 'organization',
      entityId: result.access.profile.organization_id,
      module: 'Billing',
      page: '/billing',
      metadata: { plan, provider },
    })

    return NextResponse.json({ checkout_url: checkoutUrl })
  } catch (error) {
    console.error('Checkout start error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
