import { NextResponse } from 'next/server'
import { requireAdminAccess, MANAGER_ROLES } from '@/lib/admin-auth'

export async function GET() {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data } = await result.access.adminSupabase
      .from('notifications')
      .select('*')
      .eq('organization_id', result.access.profile.organization_id!)
      .or(`profile_id.is.null,profile_id.eq.${result.access.profile.id}`)
      .order('created_at', { ascending: false })
      .limit(100)

    return NextResponse.json({
      notifications: data || [],
      unread: (data || []).filter((item) => !item.read_at).length,
    })
  } catch (error) {
    console.error('Notifications load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const notificationId = typeof body.id === 'string' ? body.id : ''
    const readAt = body.read === false ? null : new Date().toISOString()

    if (body.action === 'mark_all_read') {
      const { error } = await result.access.adminSupabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('organization_id', result.access.profile.organization_id!)
        .or(`profile_id.is.null,profile_id.eq.${result.access.profile.id}`)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 })
    }

    const { error } = await result.access.adminSupabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', notificationId)
      .eq('organization_id', result.access.profile.organization_id!)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
