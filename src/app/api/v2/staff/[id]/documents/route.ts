import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: 'Unauthorized.',
      status: 401 as const,
      profile: null,
      user: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin', 'manager'].includes(profile.role)) {
    return {
      error: 'Forbidden.',
      status: 403 as const,
      profile: null,
      user: null,
    }
  }

  return {
    error: null,
    status: 200 as const,
    profile,
    user,
  }
}

function getActorMetadata(access: any) {
  return {
    actor_name:
      access.profile?.full_name ||
      access.user?.email ||
      'Unknown user',
    actor_email:
      access.profile?.email ||
      access.user?.email ||
      null,
    actor_role: access.profile?.role || 'Unknown role',
  }
}

function buildChanges(beforeData: Record<string, any> | null, afterData: Record<string, any>) {
  const changes = []

  for (const key of Object.keys(afterData)) {
    const beforeValue = beforeData ? beforeData[key] : null
    const afterValue = afterData[key]

    if (beforeValue !== afterValue) {
      changes.push({
        field: key,
        before: beforeValue,
        after: afterValue,
      })
    }
  }

  return changes
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

    if (access.error || !access.profile || !access.user) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const body = await request.json()
    const adminSupabase = createAdminClient()

    const document_type_id =
      typeof body.document_type_id === 'string' && body.document_type_id.trim()
        ? body.document_type_id.trim()
        : null

    const custom_document_name =
      typeof body.custom_document_name === 'string' && body.custom_document_name.trim()
        ? body.custom_document_name.trim()
        : null

    const custom_document_code =
      typeof body.custom_document_code === 'string' && body.custom_document_code.trim()
        ? body.custom_document_code.trim()
        : null

    const custom_has_expiry = Boolean(body.custom_has_expiry)

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
      .select('id, full_name')
      .eq('id', id)
      .single()

    if (staffError || !existingStaff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    let has_expiry = false
    let documentTypeName: string | null = null

    if (!isCustomDocument) {
      const { data: docType, error: docTypeError } = await adminSupabase
        .from('document_types')
        .select('id, name, has_expiry')
        .eq('id', document_type_id)
        .single()

      if (docTypeError || !docType) {
        return NextResponse.json({ error: 'Document type not found.' }, { status: 404 })
      }

      has_expiry = !!docType.has_expiry
      documentTypeName = docType.name
    } else {
      has_expiry = custom_has_expiry
      documentTypeName = custom_document_name
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
          ...getActorMetadata(access),
          module: 'Staff Management',
          page: `/admin/staff/${id}/documents`,
          staff_id: id,
          staff_name: existingStaff.full_name,
          document_name: documentTypeName,
          changes: buildChanges(null, insertPayload),
          note: `Document ${documentTypeName || 'Unknown document'} was created for ${existingStaff.full_name}.`,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      document: data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error || !access.profile || !access.user) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const body = await request.json()
    const adminSupabase = createAdminClient()

    const document_id =
      typeof body.document_id === 'string' && body.document_id.trim()
        ? body.document_id.trim()
        : ''

    const document_type_id =
      typeof body.document_type_id === 'string' && body.document_type_id.trim()
        ? body.document_type_id.trim()
        : null

    const custom_document_name =
      typeof body.custom_document_name === 'string' && body.custom_document_name.trim()
        ? body.custom_document_name.trim()
        : null

    const custom_document_code =
      typeof body.custom_document_code === 'string' && body.custom_document_code.trim()
        ? body.custom_document_code.trim()
        : null

    const custom_has_expiry = Boolean(body.custom_has_expiry)

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

    const { data: existingStaff } = await adminSupabase
      .from('staff')
      .select('id, full_name')
      .eq('id', id)
      .single()

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const { data: existingDocument, error: existingDocumentError } =
      await adminSupabase
        .from('staff_documents')
        .select('*')
        .eq('id', document_id)
        .eq('staff_id', id)
        .single()

    if (existingDocumentError || !existingDocument) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    let has_expiry = false
    let documentTypeName: string | null = null

    if (!isCustomDocument) {
      const { data: docType, error: docTypeError } = await adminSupabase
        .from('document_types')
        .select('id, name, has_expiry')
        .eq('id', document_type_id)
        .single()

      if (docTypeError || !docType) {
        return NextResponse.json({ error: 'Document type not found.' }, { status: 404 })
      }

      has_expiry = !!docType.has_expiry
      documentTypeName = docType.name
    } else {
      has_expiry = custom_has_expiry
      documentTypeName = custom_document_name
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
          ...getActorMetadata(access),
          module: 'Staff Management',
          page: `/admin/staff/${id}/documents`,
          staff_id: id,
          staff_name: existingStaff.full_name,
          document_name: documentTypeName,
          changes: buildChanges(existingDocument, updatePayload),
          note: `Document ${documentTypeName || 'Unknown document'} was updated for ${existingStaff.full_name}.`,
        },
      },
    ])

    return NextResponse.json({
      success: true,
      document: data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await checkAccess()

    if (access.error || !access.profile || !access.user) {
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

    const { data: existingStaff } = await adminSupabase
      .from('staff')
      .select('id, full_name')
      .eq('id', id)
      .single()

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    const { data: existingDocument } = await adminSupabase
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

    const documentName =
      existingDocument.document_types?.name ||
      existingDocument.custom_document_name ||
      'Unknown document'

    await adminSupabase.from('audit_logs').insert([
      {
        actor_profile_id: access.profile.id,
        action_type: 'delete_staff_document_v2',
        entity_type: 'staff_document',
        entity_id: document_id,
        metadata: {
          ...getActorMetadata(access),
          module: 'Staff Management',
          page: `/admin/staff/${id}/documents`,
          staff_id: id,
          staff_name: existingStaff.full_name,
          document_name: documentName,
          deleted_record: existingDocument,
          changes: [
            {
              field: 'document_deleted',
              before: documentName,
              after: null,
            },
          ],
          note: `Document ${documentName} was deleted for ${existingStaff.full_name}.`,
        },
      },
    ])

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}