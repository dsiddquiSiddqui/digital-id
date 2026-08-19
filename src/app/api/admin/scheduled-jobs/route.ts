import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const [{ data: jobs }, { data: runs }] = await Promise.all([
      result.access.adminSupabase
        .from('scheduled_jobs')
        .select('*')
        .order('job_key'),
      result.access.adminSupabase
        .from('scheduled_job_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(40),
    ])

    return NextResponse.json({ jobs: jobs || [], runs: runs || [] })
  } catch (error) {
    console.error('Scheduled jobs load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    const isEnabled = body.is_enabled !== false

    const { data, error } = await result.access.adminSupabase
      .from('scheduled_jobs')
      .update({ is_enabled: isEnabled })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAuditLog({
      access: result.access,
      action: isEnabled ? 'scheduled_job_enabled' : 'scheduled_job_disabled',
      entityType: 'scheduled_job',
      entityId: data.id,
      module: 'Scheduled Jobs',
      page: '/scheduled-jobs',
      metadata: { job_key: data.job_key },
    })

    return NextResponse.json({ job: data })
  } catch (error) {
    console.error('Scheduled job update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    const { data: job, error } = await result.access.adminSupabase
      .from('scheduled_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !job) return NextResponse.json({ error: error?.message || 'Job not found.' }, { status: 404 })
    if (!job.is_enabled) return NextResponse.json({ error: 'Enable the job before running it.' }, { status: 400 })

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    if (!origin) return NextResponse.json({ error: 'Missing app origin for manual run.' }, { status: 400 })

    const response = await fetch(new URL(job.endpoint, origin), {
      method: 'POST',
      headers: process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {},
    })
    const payload = await response.json().catch(() => ({}))

    await writeAuditLog({
      access: result.access,
      action: 'scheduled_job_manual_run',
      entityType: 'scheduled_job',
      entityId: job.id,
      module: 'Scheduled Jobs',
      page: '/scheduled-jobs',
      metadata: { job_key: job.job_key, status: response.status, payload },
    })

    return NextResponse.json({ ok: response.ok, status: response.status, payload })
  } catch (error) {
    console.error('Scheduled job manual run error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
