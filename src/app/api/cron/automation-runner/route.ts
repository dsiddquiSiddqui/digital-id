import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email'
import { finishScheduledJobRun, startScheduledJobRun } from '@/lib/scheduled-jobs'

function daysAhead(rule: { conditions?: { days_before?: unknown } | null }) {
  const value = Number(rule.conditions?.days_before)
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 14
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

    run = await startScheduledJobRun(supabase, 'automation_runner')
    if (run.skipped) return NextResponse.json({ skipped: true, reason: 'disabled' })

    const { data: rules } = await supabase
      .from('workflow_automation_rules')
      .select('*, organizations(name, support_email)')
      .eq('is_active', true)

    let processed = 0

    for (const rule of rules || []) {
      let matchedCount = 0
      let actionCount = 0

      if (rule.trigger_type === 'document_expiring') {
        const soon = new Date()
        soon.setDate(soon.getDate() + daysAhead(rule))

        const { data: docs } = await supabase
          .from('staff_documents')
          .select('id, expiry_date, custom_document_name, document_types(name), staff(full_name, employee_code)')
          .eq('organization_id', rule.organization_id)
          .not('expiry_date', 'is', null)
          .lte('expiry_date', soon.toISOString().slice(0, 10))
          .limit(100)

        matchedCount = docs?.length || 0

        for (const action of rule.actions || []) {
          if (action.type === 'create_notification') {
            await supabase.from('notifications').insert({
              organization_id: rule.organization_id,
              type: 'automation',
              title: rule.name,
              body: action.message || `${matchedCount} documents matched ${rule.name}.`,
              severity: matchedCount ? 'warning' : 'info',
              action_url: '/expiry-alerts',
              metadata: {
                rule_id: rule.id,
                rule_name: rule.name,
                matched_count: matchedCount,
                staff_name: 'Team',
                document_name: 'documents',
                expiry_date: '',
              },
            })
            actionCount += 1
          }

          if (action.type === 'send_email' && rule.organizations?.support_email) {
            await sendTransactionalEmail({
              organizationId: rule.organization_id,
              to: rule.organizations.support_email,
              subject: rule.name,
              templateKey: 'automation_rule',
              text: action.message || `${matchedCount} documents matched ${rule.name}.`,
              html: `<p>${action.message || `${matchedCount} documents matched ${rule.name}.`}</p>`,
              metadata: { rule_id: rule.id, matched_count: matchedCount },
            })
            actionCount += 1
          }
        }
      }

      await supabase.from('workflow_automation_runs').insert({
        organization_id: rule.organization_id,
        rule_id: rule.id,
        status: 'completed',
        matched_count: matchedCount,
        action_count: actionCount,
      })

      await supabase
        .from('workflow_automation_rules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', rule.id)

      processed += 1
    }

    const payload = { processed, duration_ms: Date.now() - run.startedAt }
    await finishScheduledJobRun(supabase, 'automation_runner', run.runId, 'success', payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Automation runner error:', error)
    await finishScheduledJobRun(
      supabase,
      'automation_runner',
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
