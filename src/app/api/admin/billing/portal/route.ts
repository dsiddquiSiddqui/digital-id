import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
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
      .select('provider_customer_id')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .not('provider_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription?.provider_customer_id) {
      return NextResponse.json({ error: 'Start your Free subscription first, then manage every package in the billing portal.' }, { status: 400 })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      return_url: `${appUrl}/billing`,
    })

    return NextResponse.json({ portal_url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
