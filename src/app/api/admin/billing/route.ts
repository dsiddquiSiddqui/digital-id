import { NextResponse } from 'next/server'
import { requireAdminAccess, ADMIN_ROLES } from '@/lib/admin-auth'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const organizationId = result.access.profile.organization_id!
    const planUsage = await getOrganizationPlanUsage(
      result.access.adminSupabase,
      organizationId
    )

    const { data: subscription } = await result.access.adminSupabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      ...planUsage,
      subscription: subscription || null,
    })
  } catch (error) {
    console.error('Billing load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
