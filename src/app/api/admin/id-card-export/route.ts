import { NextResponse } from 'next/server'
import { MANAGER_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'

function pdfText(value: unknown) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function buildSimplePdf(lines: string[]) {
  const content = [
    'BT',
    '/F1 16 Tf',
    '50 780 Td',
    ...lines.flatMap((line, index) => [
      index === 0 ? '' : '0 -28 Td',
      `(${pdfText(line)}) Tj`,
    ]),
    'ET',
  ].filter(Boolean).join('\n')

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
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const staffId = typeof body.staff_id === 'string' ? body.staff_id : ''
    if (!staffId) return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 })

    const [{ data: staff }, { data: idCard }, { data: organization }] = await Promise.all([
      result.access.adminSupabase
        .from('staff')
        .select('id, full_name, employee_code, status')
        .eq('id', staffId)
        .eq('organization_id', result.access.profile.organization_id!)
        .single(),
      result.access.adminSupabase
        .from('staff_ids')
        .select('id, id_number, role_title, site_name, issue_date, expiry_date, status')
        .eq('staff_id', staffId)
        .eq('organization_id', result.access.profile.organization_id!)
        .eq('is_current', true)
        .maybeSingle(),
      result.access.adminSupabase
        .from('organizations')
        .select('name, support_email')
        .eq('id', result.access.profile.organization_id!)
        .single(),
    ])

    if (!staff) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 })

    const lines = [
      organization?.name || 'Digital ID X',
      'Branded Digital ID Export',
      `Name: ${staff.full_name}`,
      `Employee Code: ${staff.employee_code}`,
      `Staff Status: ${staff.status}`,
      `ID Number: ${idCard?.id_number || 'Not issued'}`,
      `Role: ${idCard?.role_title || 'Not set'}`,
      `Site: ${idCard?.site_name || 'Not set'}`,
      `Issue Date: ${idCard?.issue_date || 'Not set'}`,
      `Expiry Date: ${idCard?.expiry_date || 'Not set'}`,
      `ID Status: ${idCard?.status || 'Missing'}`,
      `Support: ${organization?.support_email || 'Not configured'}`,
    ]

    const pdf = buildSimplePdf(lines)
    const { data: exportRow } = await result.access.adminSupabase
      .from('id_card_exports')
      .insert({
        organization_id: result.access.profile.organization_id,
        staff_id: staffId,
        exported_by: result.access.profile.id,
        export_type: 'pdf',
        status: 'completed',
        metadata: { id_card_id: idCard?.id || null, generated_bytes: pdf.byteLength },
      })
      .select('*')
      .single()

    await writeAuditLog({
      access: result.access,
      action: 'id_card_pdf_exported',
      entityType: 'id_card_export',
      entityId: exportRow?.id,
      module: 'ID Card Designer',
      page: '/id-card-designer',
      metadata: { staff_id: staffId, id_card_id: idCard?.id || null },
    })

    return new Response(pdf, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="id-card-${staff.employee_code || staff.id}.pdf"`,
      },
    })
  } catch (error) {
    console.error('ID card export error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
