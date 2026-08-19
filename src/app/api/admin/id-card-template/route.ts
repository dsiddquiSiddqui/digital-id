import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'

const DEFAULT_TEMPLATE = {
  layout: 'classic',
  orientation: 'portrait',
  primaryColor: '#081a33',
  accentColor: '#0094e0',
  showLogo: true,
  showQr: true,
  showSia: true,
  showIssueDate: true,
  showExpiryDate: true,
  footerText: 'Verified Digital Identity',
  headerText: 'Digital Staff ID',
}

function cleanTemplate(value: unknown) {
  const template = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
  return {
    ...DEFAULT_TEMPLATE,
    ...template,
    layout: typeof template.layout === 'string' && ['classic', 'compact', 'bold'].includes(template.layout) ? template.layout : 'classic',
    orientation: typeof template.orientation === 'string' && ['portrait', 'landscape'].includes(template.orientation) ? template.orientation : 'portrait',
    primaryColor: typeof template.primaryColor === 'string' ? template.primaryColor : DEFAULT_TEMPLATE.primaryColor,
    accentColor: typeof template.accentColor === 'string' ? template.accentColor : DEFAULT_TEMPLATE.accentColor,
    headerText: typeof template.headerText === 'string' ? template.headerText.slice(0, 60) : DEFAULT_TEMPLATE.headerText,
    footerText: typeof template.footerText === 'string' ? template.footerText.slice(0, 80) : DEFAULT_TEMPLATE.footerText,
  }
}

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const { data } = await result.access.adminSupabase
      .from('organizations')
      .select('id_card_template, name, logo_url')
      .eq('id', result.access.profile.organization_id!)
      .single()

    return NextResponse.json({
      template: cleanTemplate(data?.id_card_template),
      organization: { name: data?.name, logo_url: data?.logo_url },
    })
  } catch (error) {
    console.error('ID card template load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const template = cleanTemplate(body.template)

    const { data, error } = await result.access.adminSupabase
      .from('organizations')
      .update({ id_card_template: template })
      .eq('id', result.access.profile.organization_id!)
      .select('id_card_template')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAuditLog({
      access: result.access,
      action: 'id_card_template_updated',
      entityType: 'organization',
      entityId: result.access.profile.organization_id,
      module: 'ID Card Designer',
      page: '/id-card-designer',
      metadata: { template },
    })

    return NextResponse.json({ template: data?.id_card_template || template })
  } catch (error) {
    console.error('ID card template save error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
