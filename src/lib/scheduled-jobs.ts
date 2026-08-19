import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseLike = Pick<SupabaseClient, 'from'>

export async function startScheduledJobRun(supabase: SupabaseLike, jobKey: string) {
  try {
    const { data: job } = await supabase
      .from('scheduled_jobs')
      .select('id, is_enabled')
      .eq('job_key', jobKey)
      .maybeSingle()

    if (job && job.is_enabled === false) {
      await supabase.from('scheduled_job_runs').insert({
        job_id: job.id,
        job_key: jobKey,
        status: 'skipped',
        finished_at: new Date().toISOString(),
        metadata: { reason: 'disabled' },
      })
      await supabase
        .from('scheduled_jobs')
        .update({ last_run_at: new Date().toISOString(), last_status: 'skipped' })
        .eq('job_key', jobKey)
      return { skipped: true, runId: null as string | null, startedAt: Date.now() }
    }

    const { data: run } = await supabase
      .from('scheduled_job_runs')
      .insert({
        job_id: job?.id || null,
        job_key: jobKey,
        status: 'running',
      })
      .select('id')
      .single()

    await supabase
      .from('scheduled_jobs')
      .update({ last_run_at: new Date().toISOString(), last_status: 'running', last_error: null })
      .eq('job_key', jobKey)

    return { skipped: false, runId: run?.id || null, startedAt: Date.now() }
  } catch {
    return { skipped: false, runId: null as string | null, startedAt: Date.now() }
  }
}

export async function finishScheduledJobRun(
  supabase: SupabaseLike,
  jobKey: string,
  runId: string | null,
  status: 'success' | 'failed',
  metadata: Record<string, unknown> = {},
  errorMessage?: string
) {
  try {
    const now = new Date().toISOString()
    const durationMs = Number(metadata.duration_ms || 0)

    if (runId) {
      await supabase
        .from('scheduled_job_runs')
        .update({
          status,
          finished_at: now,
          duration_ms: durationMs,
          error_message: errorMessage || null,
          metadata,
        })
        .eq('id', runId)
    }

    const update: Record<string, unknown> = {
      last_status: status,
      last_error: errorMessage || null,
    }
    if (status === 'success') update.last_success_at = now
    if (status === 'failed') update.last_failure_at = now

    await supabase
      .from('scheduled_jobs')
      .update(update)
      .eq('job_key', jobKey)
  } catch {
    // Job observability must never break the job itself.
  }
}
