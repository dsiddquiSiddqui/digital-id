import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.organization_id || profile.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { data: staff } = await adminSupabase
      .from('staff')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!staff) return NextResponse.json({ error: 'Staff record not found.' }, { status: 404 })

    const body = await request.json()
    const documentId = text(body.document_id)
    const documentTypeId = text(body.document_type_id)
    const fileUrl = text(body.file_url)

    if (!fileUrl) {
      return NextResponse.json({ error: 'Document file is required.' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('staff_document_renewal_requests')
      .insert({
        organization_id: profile.organization_id,
        staff_id: staff.id,
        document_id: documentId,
        document_type_id: documentTypeId,
        submitted_by: profile.id,
        file_url: fileUrl,
        document_number: text(body.document_number),
        issue_date: text(body.issue_date),
        expiry_date: text(body.expiry_date),
        notes: text(body.notes),
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await adminSupabase.from('notifications').insert({
      organization_id: profile.organization_id,
      type: 'document_renewal_submitted',
      title: 'Document renewal submitted',
      body: 'A staff member submitted a document for approval.',
      severity: 'info',
      action_url: '/document-renewals',
      metadata: { renewal_id: data.id, staff_id: staff.id },
    })

    return NextResponse.json({ renewal: data })
  } catch (error) {
    console.error('Staff renewal submit error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
