import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized.', status: 401 as const, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin', 'manager'].includes(profile.role)) {
    return { error: 'Forbidden.', status: 403 as const, profile: null }
  }

  return { error: null, status: 200 as const, profile }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('staff_documents')
      .select(`
        *,
        document_types (
          id,
          code,
          name,
          has_expiry
        )
      `)
      .eq('staff_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ documents: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error || !access.profile) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const body = await request.json()
    const adminSupabase = createAdminClient()

    const rawDocumentTypeId = body.document_type_id
    const rawCustomName = body.custom_document_name
    const rawCustomCode = body.custom_document_code
    const rawCustomHasExpiry = body.custom_has_expiry

    const document_type_id =
      typeof rawDocumentTypeId === 'string' && rawDocumentTypeId.trim()
        ? rawDocumentTypeId.trim()
        : null

    const custom_document_name =
      typeof rawCustomName === 'string' && rawCustomName.trim()
        ? rawCustomName.trim()
        : null

    const custom_document_code =
      typeof rawCustomCode === 'string' && rawCustomCode.trim()
        ? rawCustomCode.trim()
        : null

    const custom_has_expiry = Boolean(rawCustomHasExpiry)

    const document_number =
      typeof body.document_number === 'string' && body.document_number.trim()
        ? body.document_number.trim()
        : null

    const issue_date =
      typeof body.issue_date === 'string' && body.issue_date.trim()
        ? body.issue_date.trim()
        : null

    const expiry_date =
      typeof body.expiry_date === 'string' && body.expiry_date.trim()
        ? body.expiry_date.trim()
        : null

    const status =
      typeof body.status === 'string' && body.status.trim()
        ? body.status.trim()
        : 'pending'

    const file_url =
      typeof body.file_url === 'string' && body.file_url.trim()
        ? body.file_url.trim()
        : null

    const notes =
      typeof body.notes === 'string' && body.notes.trim()
        ? body.notes.trim()
        : null

    const show_on_staff_panel =
      typeof body.show_on_staff_panel === 'boolean'
        ? body.show_on_staff_panel
        : false

    const isCustomDocument = !document_type_id

    if (!document_type_id && !custom_document_name) {
      return NextResponse.json(
        { error: 'Document type or custom document name is required.' },
        { status: 400 }
      )
    }

    if (issue_date && expiry_date && expiry_date <= issue_date) {
      return NextResponse.json(
        { error: 'Expiry date must be later than issue date.' },
        { status: 400 }
      )
    }

    if (show_on_staff_panel && status !== 'valid') {
      return NextResponse.json(
        { error: 'Only valid documents can be shown on the staff panel.' },
        { status: 400 }
      )
    }

    const { data: existingStaff, error: staffError } = await adminSupabase
      .from('staff')
      .select('id')
      .eq('id', id)
      .single()

    if (staffError || !existingStaff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    let has_expiry = false

    if (!isCustomDocument) {
      const { data: docType, error: docTypeError } = await adminSupabase
        .from('document_types')
        .select('id, has_expiry')
        .eq('id', document_type_id)
        .single()

      if (docTypeError || !docType) {
        return NextResponse.json({ error: 'Document type not found.' }, { status: 404 })
      }

      has_expiry = !!docType.has_expiry
    } else {
      has_expiry = custom_has_expiry
    }

    const insertPayload = {
      staff_id: id,
      document_type_id: isCustomDocument ? null : document_type_id,
      custom_document_name: isCustomDocument ? custom_document_name : null,
      custom_document_code: isCustomDocument ? custom_document_code : null,
      has_expiry,
      document_number,
      issue_date,
      expiry_date: has_expiry ? expiry_date : null,
      status,
      file_url,
      notes,
      show_on_staff_panel,
    }

    const { data, error } = await adminSupabase
      .from('staff_documents')
      .insert([insertPayload])
      .select(`
        *,
        document_types (
          id,
          code,
          name,
          has_expiry
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: 'create_staff_document_v2',
        entity_type: 'staff_document',
        entity_id: data.id,
        metadata: {
          staff_id: id,
          document_type_id,
          custom_document_name,
          status,
          show_on_staff_panel,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      document: data,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error || !access.profile) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const body = await request.json()
    const adminSupabase = createAdminClient()

    const document_id =
      typeof body.document_id === 'string' && body.document_id.trim()
        ? body.document_id.trim()
        : ''

    const rawDocumentTypeId = body.document_type_id
    const rawCustomName = body.custom_document_name
    const rawCustomCode = body.custom_document_code
    const rawCustomHasExpiry = body.custom_has_expiry

    const document_type_id =
      typeof rawDocumentTypeId === 'string' && rawDocumentTypeId.trim()
        ? rawDocumentTypeId.trim()
        : null

    const custom_document_name =
      typeof rawCustomName === 'string' && rawCustomName.trim()
        ? rawCustomName.trim()
        : null

    const custom_document_code =
      typeof rawCustomCode === 'string' && rawCustomCode.trim()
        ? rawCustomCode.trim()
        : null

    const custom_has_expiry = Boolean(rawCustomHasExpiry)

    const document_number =
      typeof body.document_number === 'string' && body.document_number.trim()
        ? body.document_number.trim()
        : null

    const issue_date =
      typeof body.issue_date === 'string' && body.issue_date.trim()
        ? body.issue_date.trim()
        : null

    const expiry_date =
      typeof body.expiry_date === 'string' && body.expiry_date.trim()
        ? body.expiry_date.trim()
        : null

    const status =
      typeof body.status === 'string' && body.status.trim()
        ? body.status.trim()
        : 'pending'

    const file_url =
      typeof body.file_url === 'string' && body.file_url.trim()
        ? body.file_url.trim()
        : null

    const notes =
      typeof body.notes === 'string' && body.notes.trim()
        ? body.notes.trim()
        : null

    const show_on_staff_panel =
      typeof body.show_on_staff_panel === 'boolean'
        ? body.show_on_staff_panel
        : false

    const isCustomDocument = !document_type_id

    if (!document_id) {
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 })
    }

    if (!document_type_id && !custom_document_name) {
      return NextResponse.json(
        { error: 'Document type or custom document name is required.' },
        { status: 400 }
      )
    }

    if (issue_date && expiry_date && expiry_date <= issue_date) {
      return NextResponse.json(
        { error: 'Expiry date must be later than issue date.' },
        { status: 400 }
      )
    }

    if (show_on_staff_panel && status !== 'valid') {
      return NextResponse.json(
        { error: 'Only valid documents can be shown on the staff panel.' },
        { status: 400 }
      )
    }

    const { data: existingDocument, error: existingDocumentError } = await adminSupabase
      .from('staff_documents')
      .select('id, staff_id')
      .eq('id', document_id)
      .eq('staff_id', id)
      .single()

    if (existingDocumentError || !existingDocument) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    let has_expiry = false

    if (!isCustomDocument) {
      const { data: docType, error: docTypeError } = await adminSupabase
        .from('document_types')
        .select('id, has_expiry')
        .eq('id', document_type_id)
        .single()

      if (docTypeError || !docType) {
        return NextResponse.json({ error: 'Document type not found.' }, { status: 404 })
      }

      has_expiry = !!docType.has_expiry
    } else {
      has_expiry = custom_has_expiry
    }

    const updatePayload = {
      document_type_id: isCustomDocument ? null : document_type_id,
      custom_document_name: isCustomDocument ? custom_document_name : null,
      custom_document_code: isCustomDocument ? custom_document_code : null,
      has_expiry,
      document_number,
      issue_date,
      expiry_date: has_expiry ? expiry_date : null,
      status,
      file_url,
      notes,
      show_on_staff_panel,
    }

    const { data, error } = await adminSupabase
      .from('staff_documents')
      .update(updatePayload)
      .eq('id', document_id)
      .eq('staff_id', id)
      .select(`
        *,
        document_types (
          id,
          code,
          name,
          has_expiry
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: 'update_staff_document_v2',
        entity_type: 'staff_document',
        entity_id: document_id,
        metadata: {
          staff_id: id,
          document_type_id,
          custom_document_name,
          status,
          show_on_staff_panel,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      document: data,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error || !access.profile) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const body = await request.json()
    const adminSupabase = createAdminClient()

    const document_id =
      typeof body.document_id === 'string' ? body.document_id.trim() : ''

    if (!document_id) {
      return NextResponse.json({ error: 'Missing document_id.' }, { status: 400 })
    }

    const { data: existingDocument } = await adminSupabase
      .from('staff_documents')
      .select('id, staff_id')
      .eq('id', document_id)
      .eq('staff_id', id)
      .single()

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    const { error } = await adminSupabase
      .from('staff_documents')
      .delete()
      .eq('id', document_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: 'delete_staff_document_v2',
        entity_type: 'staff_document',
        entity_id: document_id,
        metadata: {
          staff_id: id,
        },
      },
    ])

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}