import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'

export async function POST() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data: organization } = await result.access.adminSupabase
      .from('organizations')
      .select('payment_portal_url')
      .eq('id', result.access.profile.organization_id!)
      .single()

    if (!organization?.payment_portal_url) {
      return NextResponse.json({
        setup_required: true,
        message: 'Payment portal is not configured for this organization.',
      })
    }

    return NextResponse.json({ portal_url: organization.payment_portal_url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
