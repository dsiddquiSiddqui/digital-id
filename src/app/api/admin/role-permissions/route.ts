import { NextResponse } from 'next/server'
import {
  actorMetadata,
  ADMIN_ROLES,
  requireAdminAccess,
} from '@/lib/admin-auth'

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data } = await result.access.adminSupabase
      .from('organizations')
      .select('id, role_permissions')
      .eq('id', result.access.profile.organization_id!)
      .single()

    return NextResponse.json({ role_permissions: data?.role_permissions || {} })
  } catch (error) {
    console.error('Role permissions load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const rolePermissions =
      body && typeof body.role_permissions === 'object' && !Array.isArray(body.role_permissions)
        ? body.role_permissions
        : {}

    const { data, error } = await result.access.adminSupabase
      .from('organizations')
      .update({ role_permissions: rolePermissions })
      .eq('id', result.access.profile.organization_id!)
      .select('id, role_permissions')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await result.access.adminSupabase.from('audit_logs').insert({
      organization_id: result.access.profile.organization_id!,
      actor_profile_id: result.access.profile.id,
      action_type: 'role_permissions_updated',
      entity_type: 'organization',
      entity_id: result.access.profile.organization_id!,
      metadata: {
        ...actorMetadata(result.access),
        module: 'Settings',
        page: '/settings/permissions',
        role_permissions: rolePermissions,
      },
    })

    return NextResponse.json({ role_permissions: data?.role_permissions || {} })
  } catch (error) {
    console.error('Role permissions save error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
