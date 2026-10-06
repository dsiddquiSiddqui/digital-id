import { NextResponse } from 'next/server'
import { requireAdminAccess, ADMIN_ROLES } from '@/lib/admin-auth'

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const organizationId = result.access.profile.organization_id!
    const [{ data: org }, users, staff, ids, docs] = await Promise.all([
      result.access.adminSupabase
        .from('organizations')
        .select('id, name, slug, plan, logo_url, favicon_url, background_image_url, support_email, support_phone, role_permissions')
        .eq('id', organizationId)
        .single(),
      result.access.adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .neq('role', 'staff'),
      result.access.adminSupabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      result.access.adminSupabase
        .from('staff_ids')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      result.access.adminSupabase
        .from('staff_documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
    ])

    const permissionsConfigured =
      org?.role_permissions &&
      typeof org.role_permissions === 'object' &&
      Object.keys(org.role_permissions).length > 0

    const items = [
      { key: 'brand', label: 'Upload logo and choose brand colors', done: Boolean(org?.logo_url) },
      { key: 'favicon', label: 'Upload favicon', done: Boolean(org?.favicon_url) },
      { key: 'background', label: 'Optional workspace background uploaded', done: Boolean(org?.background_image_url) },
      { key: 'package', label: 'Choose a package', done: Boolean(org?.plan && org.plan !== 'free') },
      { key: 'users', label: 'Add at least one extra admin/user', done: (users.count || 0) > 1 },
      { key: 'staff', label: 'Add first staff record', done: (staff.count || 0) > 0 },
      { key: 'digital_id', label: 'Issue first digital ID', done: (ids.count || 0) > 0 },
      { key: 'documents', label: 'Upload staff document', done: (docs.count || 0) > 0 },
      { key: 'permissions', label: 'Review permission matrix', done: permissionsConfigured },
      { key: 'support', label: 'Add support email or phone', done: Boolean(org?.support_email || org?.support_phone) },
    ]

    return NextResponse.json({
      items,
      completed: items.filter((item) => item.done).length,
      total: items.length,
    })
  } catch (error) {
    console.error('Onboarding checklist error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
