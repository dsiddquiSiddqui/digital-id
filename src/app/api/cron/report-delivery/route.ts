import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email'
import { finishScheduledJobRun, startScheduledJobRun } from '@/lib/scheduled-jobs'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  let run: Awaited<ReturnType<typeof startScheduledJobRun>> | null = null

  try {
    const expectedToken = process.env.CRON_SECRET
    const providedToken = request.headers.get('x-cron-secret')
    const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    if (expectedToken && providedToken !== expectedToken && bearerToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    run = await startScheduledJobRun(supabase, 'report_delivery')
    if (run.skipped) return NextResponse.json({ skipped: true, reason: 'disabled' })

    const { data: schedules } = await supabase
      .from('report_schedules')
      .select('*, organizations(name, support_email)')
      .eq('is_enabled', true)
      .limit(100)

    let sent = 0
    let skipped = 0

    for (const schedule of schedules || []) {
      const organization = Array.isArray(schedule.organizations) ? schedule.organizations[0] : schedule.organizations
      const recipients = Array.isArray(schedule.recipients) && schedule.recipients.length
        ? schedule.recipients
        : organization?.support_email
        ? [organization.support_email]
        : []

      if (!recipients.length) {
        skipped += 1
        continue
      }

      for (const recipient of recipients) {
        const result = await sendTransactionalEmail({
          organizationId: schedule.organization_id,
          to: recipient,
          subject: `${schedule.name} is ready`,
          templateKey: 'scheduled_report',
          metadata: {
            organization_name: organization?.name || 'Digital ID X',
            report_name: schedule.name,
            report_type: schedule.report_type,
            report_format: schedule.format,
          },
          text: `${schedule.name} is ready. Open Reports in the admin dashboard to download the latest export.`,
          html: `<p>${schedule.name} is ready.</p><p>Open Reports in the admin dashboard to download the latest export.</p>`,
        })
        if (result.status === 'sent') sent += 1
        else skipped += 1
      }

      await supabase
        .from('report_schedules')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', schedule.id)
    }

    const payload = { processed: schedules?.length || 0, sent, skipped, duration_ms: Date.now() - run.startedAt }
    await finishScheduledJobRun(supabase, 'report_delivery', run.runId, 'success', payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Report delivery cron error:', error)
    await finishScheduledJobRun(
      supabase,
      'report_delivery',
      run?.runId || null,
      'failed',
      { duration_ms: run ? Date.now() - run.startedAt : 0 },
      error instanceof Error ? error.message : 'Internal server error.'
    )
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return POST(request)
}
