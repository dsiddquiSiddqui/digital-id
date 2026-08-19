import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email'
import { finishScheduledJobRun, startScheduledJobRun } from '@/lib/scheduled-jobs'

function daysUntil(dateValue: string) {
  const now = new Date()
  const target = new Date(dateValue)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

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

    run = await startScheduledJobRun(supabase, 'expiry_reminders')
    if (run.skipped) return NextResponse.json({ skipped: true, reason: 'disabled' })

    const soon = new Date()
    soon.setDate(soon.getDate() + 30)

    const { data: documents } = await supabase
      .from('staff_documents')
      .select(`
        id,
        organization_id,
        expiry_date,
        status,
        custom_document_name,
        document_types(name),
        staff(full_name, employee_code),
        organizations(name, support_email)
      `)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', soon.toISOString().slice(0, 10))
      .order('expiry_date', { ascending: true })
      .limit(250)

    let sent = 0
    let skipped = 0

    for (const document of documents || []) {
      const organization = Array.isArray(document.organizations)
        ? document.organizations[0]
        : document.organizations
      const documentType = Array.isArray(document.document_types)
        ? document.document_types[0]
        : document.document_types
      const staff = Array.isArray(document.staff) ? document.staff[0] : document.staff
      const recipient = organization?.support_email
      const remaining = daysUntil(document.expiry_date)
      const label = document.custom_document_name || documentType?.name || 'Document'

      if (!recipient) {
        await supabase.from('notifications').insert({
          organization_id: document.organization_id,
          type: 'expiry_reminder',
          title: 'Document needs expiry follow-up',
          body: `${label} for ${staff?.full_name || 'staff'} expires on ${document.expiry_date}. Add a support email to send reminders.`,
          severity: remaining < 0 ? 'critical' : 'warning',
          action_url: '/expiry-alerts',
          metadata: {
            document_id: document.id,
            days_until: remaining,
          },
        })
        skipped += 1
        continue
      }

      const subject =
        remaining < 0
          ? `Expired document: ${label}`
          : `Document expiring in ${remaining} days: ${label}`

      const result = await sendTransactionalEmail({
        organizationId: document.organization_id,
        to: recipient,
        subject,
        templateKey: 'expiry_reminder',
        metadata: {
          staff_name: staff?.full_name,
          employee_code: staff?.employee_code,
          document_name: label,
          document_id: document.id,
          expiry_date: document.expiry_date,
          days_until: remaining,
        },
        text: `${label} for ${staff?.full_name || 'staff'} expires on ${document.expiry_date}.`,
        html: `<p>${label} for <strong>${staff?.full_name || 'staff'}</strong> expires on ${document.expiry_date}.</p>`,
      })

      if (result.status === 'sent') sent += 1
      else skipped += 1

      await supabase.from('notifications').insert({
        organization_id: document.organization_id,
        type: 'expiry_reminder',
        title: subject,
        body: `${label} for ${staff?.full_name || 'staff'} expires on ${document.expiry_date}.`,
        severity: remaining < 0 ? 'critical' : 'warning',
        action_url: '/expiry-alerts',
        metadata: {
          document_id: document.id,
          days_until: remaining,
          email_status: result.status,
        },
      })
    }

    const payload = { processed: documents?.length || 0, sent, skipped, duration_ms: Date.now() - run.startedAt }
    await finishScheduledJobRun(supabase, 'expiry_reminders', run.runId, 'success', payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Expiry reminder cron error:', error)
    await finishScheduledJobRun(
      supabase,
      'expiry_reminders',
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
