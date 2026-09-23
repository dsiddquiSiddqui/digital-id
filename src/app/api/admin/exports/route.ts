import { NextResponse } from 'next/server'
import { ADMIN_ROLES, MANAGER_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { toCsv } from '@/lib/csv'
import { writeAuditLog } from '@/lib/audit'
import { hasPermission, requirePermission } from '@/lib/permissions'

const TABLES = [
  'profiles',
  'staff',
  'staff_ids',
  'staff_documents',
  'audit_logs',
  'organization_subscriptions',
] as const

function pdfText(value: unknown) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildPdf(lines: string[]) {
  const content = ['BT', '/F1 14 Tf', '50 780 Td', ...lines.flatMap((line, index) => [index ? '0 -24 Td' : '', `(${pdfText(line)}) Tj`]), 'ET'].filter(Boolean).join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
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
    const type = url.searchParams.get('type') || 'backup'
    const format = url.searchParams.get('format') || 'json'
    const { data: organization, error: organizationError } = await result.access.adminSupabase
      .from('organizations')
      .select('name, slug, logo_url, support_email')
      .eq('id', organizationId)
      .single()

    if (organizationError) {
      console.error('Export organization query error:', organizationError)
      return NextResponse.json({ error: 'Unable to load organization details for this export.' }, { status: 500 })
    }

    const isAdmin = ADMIN_ROLES.includes(result.access.profile.role)
    const canExportAudit = await hasPermission(result.access, 'view_audit')
    if (type === 'audit_logs' && !canExportAudit) {
      return NextResponse.json({ error: 'Missing permission: view_audit.' }, { status: 403 })
    }

    if (format === 'csv' && TABLES.includes(type as (typeof TABLES)[number])) {
      if (!isAdmin && !['staff', 'audit_logs'].includes(type)) {
        return NextResponse.json({ error: 'This export is restricted to administrators.' }, { status: 403 })
      }

      const { data, error } = await result.access.adminSupabase
        .from(type)
        .select('*')
        .eq('organization_id', organizationId)
        .limit(5000)

      if (error) {
        console.error(`${type} export query error:`, error)
        return NextResponse.json({ error: 'Unable to generate this export.' }, { status: 500 })
      }

      const rows = (data || []) as Array<Record<string, unknown>>
      const headers = rows[0] ? Object.keys(rows[0]) : ['empty']
      const csv = [
        `# ${organization?.name || 'Digital ID X'} export`,
        `# Type: ${type}`,
        `# Exported: ${new Date().toISOString()}`,
        toCsv(headers, rows.length ? rows : [{ empty: 'No rows' }]),
      ].join('\n')

      await result.access.adminSupabase.from('export_requests').insert({
        organization_id: organizationId,
        requested_by: result.access.profile.id,
        export_type: `${type}_csv`,
        status: 'completed',
        row_count: rows.length,
      })

      await writeAuditLog({
        access: result.access,
        action: 'organization_exported',
        entityType: 'organization',
        entityId: organizationId,
        module: 'Reports',
        page: '/reports',
        metadata: { type, format, rows: rows.length },
      })

      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${type}.csv"`,
        },
      })
    }

    if (format === 'pdf') {
      if (!['staff', 'audit_logs'].includes(type)) {
        return NextResponse.json({ error: 'Unsupported PDF report type.' }, { status: 400 })
      }
      const pdf = buildPdf([
        organization?.name || 'Digital ID X',
        'Branded Export Summary',
        `Type: ${type}`,
        `Generated: ${new Date().toISOString()}`,
        `Workspace: ${organization?.slug || organizationId}`,
        `Support: ${organization?.support_email || 'Not configured'}`,
      ])

      await result.access.adminSupabase.from('export_requests').insert({
        organization_id: organizationId,
        requested_by: result.access.profile.id,
        export_type: `${type}_pdf`,
        status: 'completed',
        row_count: 1,
      })

      return new Response(pdf, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `attachment; filename="${type}-summary.pdf"`,
        },
      })
    }

    if (format !== 'json' || type !== 'backup') {
      return NextResponse.json({ error: 'Unsupported export format or type.' }, { status: 400 })
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Organization backups are restricted to administrators.' }, { status: 403 })
    }

    const exportData: Record<string, unknown> = {}
    let rowCount = 0

    for (const table of TABLES) {
      const { data, error } = await result.access.adminSupabase
        .from(table)
        .select('*')
        .eq('organization_id', organizationId)
        .limit(5000)

      if (error) {
        console.error(`${table} backup query error:`, error)
        return NextResponse.json({ error: 'Unable to generate the organization backup.' }, { status: 500 })
      }

      exportData[table] = data || []
      rowCount += data?.length || 0
    }

    await result.access.adminSupabase.from('export_requests').insert({
      organization_id: organizationId,
      requested_by: result.access.profile.id,
      export_type: 'organization_backup_json',
      status: 'completed',
      row_count: rowCount,
    })

    await writeAuditLog({
      access: result.access,
      action: 'organization_backup_exported',
      entityType: 'organization',
      entityId: organizationId,
      module: 'Reports',
      page: '/reports',
      metadata: { format: 'json', rows: rowCount },
    })

    return new Response(
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          organization_id: organizationId,
          brand: organization,
          data: exportData,
        },
        null,
        2
      ),
      {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': 'attachment; filename="organization-backup.json"',
        },
      }
    )
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
