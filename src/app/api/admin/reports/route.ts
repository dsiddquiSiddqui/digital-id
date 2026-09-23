import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess, MANAGER_ROLES } from '@/lib/admin-auth'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'
import { hasPermission, requirePermission } from '@/lib/permissions'

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n')
}

export async function GET(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const permissionError = await requirePermission(result.access, 'view_reports')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    const organizationId = result.access.profile.organization_id!
    const url = new URL(request.url)
    const format = url.searchParams.get('format')
    const type = url.searchParams.get('type') || 'summary'

    if (format === 'csv') {
      if (type === 'staff') {
        const { data, error } = await result.access.adminSupabase
          .from('staff')
          .select('employee_code, full_name, email, phone, company_name, status, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Staff report query error:', error)
          return NextResponse.json({ error: 'Unable to generate the staff report.' }, { status: 500 })
        }

        const csv = toCsv(
          ['employee_code', 'full_name', 'email', 'phone', 'company_name', 'status', 'created_at'],
          data || []
        )
        return new Response(csv, {
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': 'attachment; filename="staff-report.csv"',
          },
        })
      }

      if (type === 'expired-documents') {
        const today = new Date().toISOString().slice(0, 10)
        const { data, error } = await result.access.adminSupabase
          .from('staff_documents')
          .select('expiry_date, status, document_number, custom_document_name, staff(full_name, employee_code)')
          .eq('organization_id', organizationId)
          .lt('expiry_date', today)
          .order('expiry_date', { ascending: true })

        if (error) {
          console.error('Expired documents report query error:', error)
          return NextResponse.json({ error: 'Unable to generate the expired documents report.' }, { status: 500 })
        }

        const rows = (data || []).map((row) => {
          const staff = Array.isArray(row.staff) ? row.staff[0] : row.staff
          return {
            staff_name: staff?.full_name,
            employee_code: staff?.employee_code,
            document: row.custom_document_name || row.document_number || 'Document',
            expiry_date: row.expiry_date,
            status: row.status,
          }
        })

        const csv = toCsv(
          ['staff_name', 'employee_code', 'document', 'expiry_date', 'status'],
          rows
        )
        return new Response(csv, {
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': 'attachment; filename="expired-documents.csv"',
          },
        })
      }

      return NextResponse.json({ error: 'Unsupported CSV report type.' }, { status: 400 })
    }

    const usage = await getOrganizationPlanUsage(result.access.adminSupabase, organizationId)
    const today = new Date().toISOString().slice(0, 10)
    const [expiredResult, revokedResult, activeResult] =
      await Promise.all([
        result.access.adminSupabase
          .from('staff_documents')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .lt('expiry_date', today),
        result.access.adminSupabase
          .from('staff_ids')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'revoked'),
        result.access.adminSupabase
          .from('staff')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active'),
      ])

    const metricsError = expiredResult.error || revokedResult.error || activeResult.error
    if (metricsError) {
      console.error('Report metrics query error:', metricsError)
      return NextResponse.json({ error: 'Unable to load report metrics.' }, { status: 500 })
    }

    const canExportAudit = await hasPermission(result.access, 'view_audit')

    return NextResponse.json({
      usage,
      metrics: {
        activeStaff: activeResult.count || 0,
        expiredDocuments: expiredResult.count || 0,
        revokedIds: revokedResult.count || 0,
      },
      capabilities: {
        canExportAudit,
        canExportBackup: ADMIN_ROLES.includes(result.access.profile.role),
      },
    })
  } catch (error) {
    console.error('Reports load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
