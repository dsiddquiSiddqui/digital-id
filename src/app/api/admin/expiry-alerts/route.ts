import { NextResponse } from 'next/server'
import { requireAdminAccess, MANAGER_ROLES } from '@/lib/admin-auth'

function daysUntil(dateValue: string) {
  const now = new Date()
  const target = new Date(dateValue)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export async function GET() {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const organizationId = result.access.profile.organization_id!
    const today = new Date()
    const soon = new Date(today)
    soon.setDate(soon.getDate() + 30)

    const [{ data: documents }, { data: ids }] = await Promise.all([
      result.access.adminSupabase
        .from('staff_documents')
        .select(`
          id,
          expiry_date,
          status,
          document_number,
          custom_document_name,
          document_types (name, code),
          staff (id, full_name, employee_code)
        `)
        .eq('organization_id', organizationId)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', soon.toISOString().slice(0, 10))
        .order('expiry_date', { ascending: true })
        .limit(100),
      result.access.adminSupabase
        .from('staff_ids')
        .select('id, id_number, expiry_date, status, staff (id, full_name, employee_code)')
        .eq('organization_id', organizationId)
        .lte('expiry_date', soon.toISOString().slice(0, 10))
        .order('expiry_date', { ascending: true })
        .limit(100),
    ])

    const documentAlerts = (documents || []).map((doc) => {
      const staff = Array.isArray(doc.staff) ? doc.staff[0] : doc.staff
      const documentType = Array.isArray(doc.document_types)
        ? doc.document_types[0]
        : doc.document_types

      return {
        id: doc.id,
        type: 'document',
        label: doc.custom_document_name || documentType?.name || 'Document',
        reference: doc.document_number || documentType?.code || null,
        expiry_date: doc.expiry_date,
        days_until: daysUntil(doc.expiry_date),
        status: doc.status,
        staff,
      }
    })

    const idAlerts = (ids || []).map((id) => {
      const staff = Array.isArray(id.staff) ? id.staff[0] : id.staff

      return {
        id: id.id,
        type: 'digital_id',
        label: 'Digital ID',
        reference: id.id_number,
        expiry_date: id.expiry_date,
        days_until: daysUntil(id.expiry_date),
        status: id.status,
        staff,
      }
    })

    const alerts = [...documentAlerts, ...idAlerts].sort(
      (a, b) => a.days_until - b.days_until
    )

    return NextResponse.json({
      alerts,
      summary: {
        expired: alerts.filter((alert) => alert.days_until < 0).length,
        due_soon: alerts.filter((alert) => alert.days_until >= 0).length,
        total: alerts.length,
      },
    })
  } catch (error) {
    console.error('Expiry alerts error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
