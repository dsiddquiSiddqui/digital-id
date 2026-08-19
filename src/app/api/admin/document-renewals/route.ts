import { NextResponse } from 'next/server'
import { requireAdminAccess, MANAGER_ROLES } from '@/lib/admin-auth'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET() {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const permissionError = await requirePermission(result.access, 'approve_documents')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    const { data } = await result.access.adminSupabase
      .from('staff_document_renewal_requests')
      .select(`
        *,
        staff(id, full_name, employee_code),
        document_types(name, code)
      `)
      .eq('organization_id', result.access.profile.organization_id!)
      .order('submitted_at', { ascending: false })
      .limit(100)

    return NextResponse.json({ renewals: data || [] })
  } catch (error) {
    console.error('Renewals load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const permissionError = await requirePermission(result.access, 'approve_documents')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : ''
    const reviewNotes = typeof body.review_notes === 'string' ? body.review_notes.trim() : null

    if (!id || !status) {
      return NextResponse.json({ error: 'Request ID and status are required.' }, { status: 400 })
    }

    const { data: renewal } = await result.access.adminSupabase
      .from('staff_document_renewal_requests')
      .select('*')
      .eq('id', id)
      .eq('organization_id', result.access.profile.organization_id!)
      .single()

    if (!renewal) {
      return NextResponse.json({ error: 'Renewal request not found.' }, { status: 404 })
    }

    if (status === 'approved') {
      const payload = {
        staff_id: renewal.staff_id,
        document_type_id: renewal.document_type_id,
        document_number: renewal.document_number,
        issue_date: renewal.issue_date,
        expiry_date: renewal.expiry_date,
        file_url: renewal.file_url,
        status: 'valid',
        verified: true,
        approval_status: 'approved',
        approved_by: result.access.profile.id,
        approved_at: new Date().toISOString(),
      }

      if (renewal.document_id) {
        await result.access.adminSupabase
          .from('staff_documents')
          .update(payload)
          .eq('id', renewal.document_id)
          .eq('organization_id', result.access.profile.organization_id!)
      } else {
        await result.access.adminSupabase.from('staff_documents').insert({
          organization_id: result.access.profile.organization_id,
          ...payload,
        })
      }
    }

    const { data: updated, error } = await result.access.adminSupabase
      .from('staff_document_renewal_requests')
      .update({
        status,
        review_notes: reviewNotes,
        reviewed_by: result.access.profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await result.access.adminSupabase.from('notifications').insert({
      organization_id: result.access.profile.organization_id,
      type: 'document_renewal_reviewed',
      title: `Document renewal ${status}`,
      body: reviewNotes || `A staff document renewal was ${status}.`,
      severity: status === 'approved' ? 'success' : 'warning',
      action_url: `/document-renewals`,
      metadata: { renewal_id: id },
    })

    await writeAuditLog({
      access: result.access,
      action: `document_renewal_${status}`,
      entityType: 'staff_document_renewal_request',
      entityId: id,
      module: 'Documents',
      page: '/document-renewals',
      metadata: { review_notes: reviewNotes },
    })

    return NextResponse.json({ renewal: updated })
  } catch (error) {
    console.error('Renewal update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
