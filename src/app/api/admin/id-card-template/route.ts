import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'
import { cleanIdCardTemplate } from '@/lib/id-card-template'

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
      template: cleanIdCardTemplate(data?.id_card_template),
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
    const template = cleanIdCardTemplate(body.template)

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
