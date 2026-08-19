import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'
import { sanitizeEmailTemplateHtml } from '@/lib/email-template-html'

const STARTER_TEMPLATES = [
  {
    template_key: 'invite_user',
    name: 'User invitation',
    subject: 'You have been invited to {{organization_name}}',
    preview_text: 'Set up your account and join the admin workspace.',
    body_html: '<p>Hello {{full_name}},</p><p>You have been invited to join {{organization_name}}. Use the secure link to finish setup.</p>',
    body_text: 'Hello {{full_name}}, you have been invited to join {{organization_name}}.',
  },
  {
    template_key: 'document_expiry',
    name: 'Document expiry alert',
    subject: '{{staff_name}} has a document expiring soon',
    preview_text: 'Review the staff document before it expires.',
    body_html: '<p>{{staff_name}} has a document expiring on {{expiry_date}}.</p><p>Please review the record in Security ID.</p>',
    body_text: '{{staff_name}} has a document expiring on {{expiry_date}}.',
  },
  {
    template_key: 'staff_renewal',
    name: 'Staff renewal request',
    subject: 'Please renew your {{document_name}}',
    preview_text: 'Upload the latest document to keep your profile compliant.',
    body_html: '<p>Hello {{staff_name}},</p><p>Please upload your renewed {{document_name}} before {{expiry_date}}.</p>',
    body_text: 'Please upload your renewed {{document_name}} before {{expiry_date}}.',
  },
]

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const { data } = await result.access.adminSupabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('template_key')

    return NextResponse.json({ templates: data || [], starters: STARTER_TEMPLATES })
  } catch (error) {
    console.error('Email templates load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const starter = STARTER_TEMPLATES.find((item) => item.template_key === body.template_key)
    const payload = {
      organization_id: result.access.profile.organization_id,
      template_key: cleanString(body.template_key || starter?.template_key).toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 64),
      name: cleanString(body.name || starter?.name),
      subject: cleanString(body.subject || starter?.subject),
      preview_text: cleanString(body.preview_text || starter?.preview_text) || null,
      body_html: sanitizeEmailTemplateHtml(cleanString(body.body_html || starter?.body_html)),
      body_text: cleanString(body.body_text || starter?.body_text) || null,
      is_active: body.is_active !== false,
      created_by: result.access.profile.id,
      metadata: { variables: ['organization_name', 'full_name', 'staff_name', 'document_name', 'expiry_date'] },
    }

    if (!payload.template_key || !payload.name || !payload.subject || !payload.body_html) {
      return NextResponse.json({ error: 'Template key, name, subject, and body are required.' }, { status: 400 })
    }

    const { data, error } = await result.access.adminSupabase
      .from('email_templates')
      .upsert(payload, { onConflict: 'organization_id,template_key' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAuditLog({
      access: result.access,
      action: 'email_template_saved',
      entityType: 'email_template',
      entityId: data.id,
      module: 'Email Templates',
      page: '/email-templates',
      metadata: { template_key: data.template_key, name: data.name },
    })

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Email template save error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const id = cleanString(body.id)
    const { data, error } = await result.access.adminSupabase
      .from('email_templates')
      .update({ is_active: body.is_active !== false })
      .eq('id', id)
      .eq('organization_id', result.access.profile.organization_id!)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Email template update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
