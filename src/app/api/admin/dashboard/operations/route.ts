import { NextResponse } from 'next/server'
import { MANAGER_ROLES, requireAdminAccess } from '@/lib/admin-auth'

export async function GET() {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const organizationId = result.access.profile.organization_id!
    const inThirtyDays = new Date()
    inThirtyDays.setDate(inThirtyDays.getDate() + 30)
    const adminSupabase = result.access.adminSupabase
    const [documentsResult, renewalsResult, notificationsResult, tasksResult] = await Promise.all([
      adminSupabase.from('staff_documents').select('id, expiry_date, staff(full_name), document_types(name)').eq('organization_id', organizationId).not('expiry_date', 'is', null).lte('expiry_date', inThirtyDays.toISOString().slice(0, 10)).order('expiry_date', { ascending: true }).limit(5),
      adminSupabase.from('staff_document_renewal_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'pending'),
      adminSupabase.from('notifications').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('read_at', null),
      adminSupabase.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['open', 'in_progress']),
    ])

    return NextResponse.json({
      expiring_documents: documentsResult.data || [],
      pending_renewals: renewalsResult.count || 0,
      unread_notifications: notificationsResult.count || 0,
      open_tasks: tasksResult.count || 0,
    })
  } catch (error) {
    console.error('Dashboard operations error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
