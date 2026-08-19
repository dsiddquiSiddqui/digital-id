import { NextResponse } from 'next/server'
import { requireAdminAccess, MANAGER_ROLES } from '@/lib/admin-auth'
import { requirePermission } from '@/lib/permissions'
import { toCsv } from '@/lib/csv'

export async function GET(request: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const permissionError = await requirePermission(result.access, 'manage_imports')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    const url = new URL(request.url)
    const batchId = url.searchParams.get('batch_id')
    const format = url.searchParams.get('format')

    if (batchId && format === 'csv') {
      const { data: rows } = await result.access.adminSupabase
        .from('staff_import_rows')
        .select('row_number, raw_data, processing_errors, processed, created_at')
        .eq('organization_id', result.access.profile.organization_id!)
        .eq('batch_id', batchId)
        .order('row_number', { ascending: true })

      const csv = toCsv(
        ['row_number', 'sheet', 'parim_staff_id', 'message', 'processed', 'created_at'],
        (rows || []).map((row) => ({
          row_number: row.row_number,
          sheet: row.raw_data?.sheet,
          parim_staff_id: row.raw_data?.parim_staff_id,
          message: row.processing_errors?.message,
          processed: row.processed,
          created_at: row.created_at,
        }))
      )

      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="import-errors-${batchId}.csv"`,
        },
      })
    }

    const { data: batches } = await result.access.adminSupabase
      .from('staff_import_batches')
      .select('*, profiles:uploaded_by(full_name, email)')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ batches: batches || [] })
  } catch (error) {
    console.error('Imports load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
