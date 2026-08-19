import { NextResponse } from 'next/server'
import { ADMIN_ROLES, MANAGER_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

const STAFF_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'archived']

function idStatusFor(status: string) {
  if (status === 'active') return 'active'
  if (status === 'suspended') return 'suspended'
  if (status === 'revoked') return 'revoked'
  if (status === 'archived') return 'inactive'
  return 'inactive'
}

function needsApproval(action: string, status: string, count: number, role: string) {
  if (ADMIN_ROLES.includes(role)) return false
  return action === 'archive_missing_ids' || ['suspended', 'revoked', 'archived'].includes(status) || count > 25
}

async function getActionPreview(access: NonNullable<Awaited<ReturnType<typeof requireAdminAccess>>['access']>, action: string, staffIds: string[]) {
  if (action !== 'archive_missing_ids') {
    return { targetCount: staffIds.length, successCount: staffIds.length, failedCount: 0, eligibleIds: staffIds }
  }

  const { data: currentIds } = await access.adminSupabase
    .from('staff_ids')
    .select('staff_id')
    .eq('organization_id', access.profile.organization_id!)
    .eq('is_current', true)
    .in('staff_id', staffIds)

  const withIds = new Set((currentIds || []).map((row) => row.staff_id))
  const eligibleIds = staffIds.filter((id: string) => !withIds.has(id))

  return {
    targetCount: staffIds.length,
    successCount: eligibleIds.length,
    failedCount: staffIds.length - eligibleIds.length,
    eligibleIds,
  }
}

async function createSnapshots(access: NonNullable<Awaited<ReturnType<typeof requireAdminAccess>>['access']>, staffIds: string[]) {
  const [{ data: staffRows }, { data: idRows }] = await Promise.all([
    access.adminSupabase
      .from('staff')
      .select('id, status')
      .eq('organization_id', access.profile.organization_id!)
      .in('id', staffIds),
    access.adminSupabase
      .from('staff_ids')
      .select('id, staff_id, status')
      .eq('organization_id', access.profile.organization_id!)
      .eq('is_current', true)
      .in('staff_id', staffIds),
  ])

  return {
    staff: staffRows || [],
    ids: idRows || [],
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const permissionError = await requirePermission(result.access, 'edit_staff')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    const body = await request.json()
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'rollback') {
      const batchId = typeof body.batch_id === 'string' ? body.batch_id : ''
      const { data: batch, error: batchError } = await result.access.adminSupabase
        .from('bulk_action_batches')
        .select('*')
        .eq('id', batchId)
        .eq('organization_id', result.access.profile.organization_id!)
        .single()

      if (batchError || !batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 })
      if (batch.rolled_back_at) return NextResponse.json({ error: 'This batch was already rolled back.' }, { status: 400 })
      if (!batch.rollback_until || new Date(batch.rollback_until).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Rollback window has expired.' }, { status: 400 })
      }

      const snapshots = batch.metadata?.snapshots || {}
      const staffSnapshots = Array.isArray(snapshots.staff) ? snapshots.staff : []
      const idSnapshots = Array.isArray(snapshots.ids) ? snapshots.ids : []

      for (const row of staffSnapshots) {
        if (row?.id && typeof row.status === 'string') {
          await result.access.adminSupabase
            .from('staff')
            .update({ status: row.status })
            .eq('id', row.id)
            .eq('organization_id', result.access.profile.organization_id!)
        }
      }

      for (const row of idSnapshots) {
        if (row?.id && typeof row.status === 'string') {
          await result.access.adminSupabase
            .from('staff_ids')
            .update({ status: row.status })
            .eq('id', row.id)
            .eq('organization_id', result.access.profile.organization_id!)
        }
      }

      const { data: rolledBack } = await result.access.adminSupabase
        .from('bulk_action_batches')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
          rolled_back_by: result.access.profile.id,
        })
        .eq('id', batch.id)
        .select('*')
        .single()

      await writeAuditLog({
        access: result.access,
        action: 'bulk_action_rolled_back',
        entityType: 'bulk_action_batch',
        entityId: batch.id,
        module: 'Bulk Actions',
        page: '/bulk-actions',
        metadata: { action_type: batch.action_type, restored_staff: staffSnapshots.length },
      })

      return NextResponse.json({ batch: rolledBack, restored_count: staffSnapshots.length })
    }

    const staffIds = Array.isArray(body.staff_ids) ? body.staff_ids.filter((id: unknown) => typeof id === 'string') : []
    const status = typeof body.status === 'string' ? body.status : ''

    if (!staffIds.length) return NextResponse.json({ error: 'Select at least one staff member.' }, { status: 400 })
    if (!['set_status', 'archive_missing_ids'].includes(action)) {
      return NextResponse.json({ error: 'Unsupported bulk action.' }, { status: 400 })
    }
    if (action === 'set_status' && !STAFF_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const preview = await getActionPreview(result.access, action, staffIds)
    const approvalRequired = needsApproval(action, status, staffIds.length, result.access.profile.role)

    if (body.preview === true) {
      return NextResponse.json({
        ...preview,
        approval_required: approvalRequired,
        rollback_minutes: 30,
      })
    }

    const snapshots = await createSnapshots(result.access, staffIds)

    if (approvalRequired && body.approved !== true) {
      const { data: batch, error } = await result.access.adminSupabase
        .from('bulk_action_batches')
        .insert({
          organization_id: result.access.profile.organization_id,
          requested_by: result.access.profile.id,
          action_type: action,
          target_type: 'staff',
          target_count: staffIds.length,
          success_count: 0,
          failed_count: 0,
          status: 'pending_approval',
          approval_status: 'pending',
          metadata: { status, staff_ids: staffIds, preview, snapshots },
        })
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      await result.access.adminSupabase.from('notifications').insert({
        organization_id: result.access.profile.organization_id,
        type: 'bulk_action_approval_required',
        title: 'Bulk action needs approval',
        body: `${staffIds.length} staff selected for ${action}.`,
        severity: 'warning',
        action_url: '/bulk-actions',
        metadata: { batch_id: batch?.id, action },
      })

      await writeAuditLog({
        access: result.access,
        action: 'bulk_action_approval_requested',
        entityType: 'bulk_action_batch',
        entityId: batch?.id,
        module: 'Bulk Actions',
        page: '/bulk-actions',
        metadata: { action, target_count: staffIds.length },
      })

      return NextResponse.json({ batch, approval_required: true, success_count: 0, failed_count: 0 })
    }

    let successCount = 0
    let failedCount = 0

    if (action === 'set_status') {
      const { error: staffError } = await result.access.adminSupabase
        .from('staff')
        .update({ status })
        .eq('organization_id', result.access.profile.organization_id!)
        .in('id', staffIds)

      if (staffError) return NextResponse.json({ error: staffError.message }, { status: 400 })

      await result.access.adminSupabase
        .from('staff_ids')
        .update({ status: idStatusFor(status) })
        .eq('organization_id', result.access.profile.organization_id!)
        .eq('is_current', true)
        .in('staff_id', staffIds)

      successCount = preview.successCount
    } else if (action === 'archive_missing_ids') {
      if (preview.eligibleIds.length) {
        const { error } = await result.access.adminSupabase
          .from('staff')
          .update({ status: 'archived' })
          .eq('organization_id', result.access.profile.organization_id!)
          .in('id', preview.eligibleIds)

        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      }

      successCount = preview.successCount
      failedCount = preview.failedCount
    }

    const { data: batch } = await result.access.adminSupabase
      .from('bulk_action_batches')
      .insert({
        organization_id: result.access.profile.organization_id,
        requested_by: result.access.profile.id,
        action_type: action,
        target_type: 'staff',
        target_count: staffIds.length,
        success_count: successCount,
        failed_count: failedCount,
        status: 'completed',
        approval_status: approvalRequired ? 'approved' : 'not_required',
        approved_by: approvalRequired ? result.access.profile.id : null,
        approved_at: approvalRequired ? new Date().toISOString() : null,
        rollback_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        metadata: { status, staff_ids: staffIds, preview, snapshots },
        completed_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    await result.access.adminSupabase.from('notifications').insert({
      organization_id: result.access.profile.organization_id,
      type: 'bulk_action_completed',
      title: 'Bulk action completed',
      body: `${successCount} staff updated. ${failedCount} skipped.`,
      severity: failedCount ? 'warning' : 'success',
      action_url: '/bulk-actions',
      metadata: { batch_id: batch?.id, action },
    })

    await writeAuditLog({
      access: result.access,
      action: 'bulk_action_completed',
      entityType: 'bulk_action_batch',
      entityId: batch?.id,
      module: 'Bulk Actions',
      page: '/bulk-actions',
      metadata: { action, success_count: successCount, failed_count: failedCount },
    })

    return NextResponse.json({ batch, success_count: successCount, failed_count: failedCount })
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const { data } = await result.access.adminSupabase
      .from('bulk_action_batches')
      .select('*')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('created_at', { ascending: false })
      .limit(40)

    return NextResponse.json({ batches: data || [] })
  } catch (error) {
    console.error('Bulk action history error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
