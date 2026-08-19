import { NextResponse } from 'next/server'
import { requireAdminAccess, MANAGER_ROLES } from '@/lib/admin-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { id } = await params
    const organizationId = result.access.profile.organization_id!

    const [{ data: staff }, { data: documentTypes }, { data: documents }] =
      await Promise.all([
        result.access.adminSupabase
          .from('staff')
          .select('id, full_name, employee_code, staff_type')
          .eq('id', id)
          .eq('organization_id', organizationId)
          .single(),
        result.access.adminSupabase
          .from('document_types')
          .select('id, code, name, has_expiry, is_mandatory, staff_type_scope')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true }),
        result.access.adminSupabase
          .from('staff_documents')
          .select('id, document_type_id, custom_document_name, status, expiry_date, file_url')
          .eq('staff_id', id)
          .eq('organization_id', organizationId),
      ])

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const documentsByType = new Map(
      (documents || [])
        .filter((doc) => doc.document_type_id)
        .map((doc) => [doc.document_type_id, doc] as const)
    )

    const checklist = (documentTypes || [])
      .filter((type) => !type.staff_type_scope || type.staff_type_scope === staff.staff_type)
      .map((type) => {
        const document = documentsByType.get(type.id)
        const expired =
          document?.expiry_date && new Date(document.expiry_date) < new Date()

        return {
          document_type: type,
          document: document || null,
          done: Boolean(document?.file_url && document.status === 'valid' && !expired),
          expired: Boolean(expired),
          required: Boolean(type.is_mandatory),
        }
      })

    return NextResponse.json({
      staff,
      checklist,
      completed: checklist.filter((item) => item.done).length,
      required_missing: checklist.filter((item) => item.required && !item.done).length,
      total: checklist.length,
    })
  } catch (error) {
    console.error('Document checklist error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
