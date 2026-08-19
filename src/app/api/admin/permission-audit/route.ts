import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { API_PERMISSION_AUDIT, permissionAuditSummary } from '@/lib/api-permission-audit'

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({
      items: API_PERMISSION_AUDIT,
      summary: permissionAuditSummary(),
    })
  } catch (error) {
    console.error('Permission audit error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
