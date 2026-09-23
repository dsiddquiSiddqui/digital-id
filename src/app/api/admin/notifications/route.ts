import { NextResponse } from 'next/server'
import { requireAdminAccess, WORKSPACE_ROLES } from '@/lib/admin-auth'

const NOTIFICATION_COLUMNS = 'id, type, title, body, severity, action_url, read_at, created_at, profile_id'

export async function GET() {
  try {
    const result = await requireAdminAccess(WORKSPACE_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { data, error } = await result.access.adminSupabase
      .from('notifications')
      .select(NOTIFICATION_COLUMNS)
      .eq('organization_id', result.access.profile.organization_id!)
      .or(`profile_id.is.null,profile_id.eq.${result.access.profile.id}`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Notifications query error:', error)
      return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 })
    }

    const sharedIds = (data || []).filter((item) => !item.profile_id).map((item) => item.id)
    const { data: receipts, error: receiptsError } = sharedIds.length
      ? await result.access.adminSupabase
          .from('notification_receipts')
          .select('notification_id, read_at')
          .eq('profile_id', result.access.profile.id)
          .in('notification_id', sharedIds)
      : { data: [], error: null }

    if (receiptsError) {
      console.error('Notification receipts query error:', receiptsError)
      return NextResponse.json({ error: 'Unable to load notification read state.' }, { status: 500 })
    }

    const receiptMap = new Map((receipts || []).map((receipt) => [receipt.notification_id, receipt.read_at]))
    const notifications = (data || []).map(({ profile_id, ...item }) => ({
      ...item,
      read_at: profile_id ? item.read_at : receiptMap.get(item.id) || null,
    }))

    return NextResponse.json({
      notifications,
      unread: notifications.filter((item) => !item.read_at).length,
    })
  } catch (error) {
    console.error('Notifications load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(WORKSPACE_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'A valid JSON body is required.' }, { status: 400 })
    }
    const notificationId = typeof body.id === 'string' ? body.id : ''
    const readAt = body.read === false ? null : new Date().toISOString()

    if (body.action === 'mark_all_read') {
      const organizationId = result.access.profile.organization_id!
      const profileId = result.access.profile.id
      const { data: shared, error: sharedError } = await result.access.adminSupabase
        .from('notifications')
        .select('id')
        .eq('organization_id', organizationId)
        .is('profile_id', null)

      if (sharedError) return NextResponse.json({ error: 'Unable to update notifications.' }, { status: 500 })

      const sharedRows = (shared || []).map((item) => ({
        notification_id: item.id,
        profile_id: profileId,
        read_at: readAt,
      }))

      if (sharedRows.length) {
        const receiptResult = body.read === false
          ? await result.access.adminSupabase
              .from('notification_receipts')
              .delete()
              .eq('profile_id', profileId)
              .in('notification_id', sharedRows.map((item) => item.notification_id))
          : await result.access.adminSupabase
              .from('notification_receipts')
              .upsert(sharedRows, { onConflict: 'notification_id,profile_id' })

        if (receiptResult.error) return NextResponse.json({ error: 'Unable to update notification read state.' }, { status: 500 })
      }

      const { error } = await result.access.adminSupabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 })
    }

    const { data: notification, error: lookupError } = await result.access.adminSupabase
      .from('notifications')
      .select('id, profile_id')
      .eq('id', notificationId)
      .eq('organization_id', result.access.profile.organization_id!)
      .maybeSingle()

    if (lookupError) return NextResponse.json({ error: 'Unable to update notification.' }, { status: 500 })
    if (!notification || (notification.profile_id && notification.profile_id !== result.access.profile.id)) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
    }

    const updateResult = notification.profile_id
      ? await result.access.adminSupabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', notificationId)
      .eq('organization_id', result.access.profile.organization_id!)
      .eq('profile_id', result.access.profile.id)
      : body.read === false
        ? await result.access.adminSupabase
            .from('notification_receipts')
            .delete()
            .eq('notification_id', notificationId)
            .eq('profile_id', result.access.profile.id)
        : await result.access.adminSupabase
            .from('notification_receipts')
            .upsert({ notification_id: notificationId, profile_id: result.access.profile.id, read_at: readAt }, { onConflict: 'notification_id,profile_id' })

    if (updateResult.error) {
      console.error('Notification read-state update error:', updateResult.error)
      return NextResponse.json({ error: 'Unable to update notification.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
