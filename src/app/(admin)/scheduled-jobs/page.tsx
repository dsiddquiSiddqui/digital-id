'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, PauseCircle, Play, RefreshCw, TimerReset } from 'lucide-react'
import { AdminEmptyState, AdminSkeleton } from '@/components/admin/Polish'
import { useToast } from '@/components/admin/ToastProvider'

type ScheduledJob = {
  id: string
  job_key: string
  name: string
  description: string | null
  endpoint: string
  cron_expression: string
  provider: string
  is_enabled: boolean
  last_run_at: string | null
  last_success_at: string | null
  last_failure_at: string | null
  last_status: string
  last_error: string | null
}

type ScheduledRun = {
  id: string
  job_key: string
  status: string
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  error_message: string | null
  metadata: Record<string, unknown>
}

export default function ScheduledJobsPage() {
  const { notify } = useToast()
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [runs, setRuns] = useState<ScheduledRun[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/scheduled-jobs')
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to load scheduled jobs.')
    else {
      setJobs(result.jobs || [])
      setRuns(result.runs || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const failures = useMemo(() => runs.filter((run) => run.status === 'failed').length, [runs])
  const enabled = useMemo(() => jobs.filter((job) => job.is_enabled).length, [jobs])

  const toggle = async (job: ScheduledJob) => {
    setBusyId(job.id)
    const response = await fetch('/api/admin/scheduled-jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, is_enabled: !job.is_enabled }),
    })
    const result = await response.json()
    if (!response.ok) notify({ tone: 'error', title: 'Job not updated', body: result.error || 'Try again.' })
    else notify({ tone: 'success', title: result.job.is_enabled ? 'Job enabled' : 'Job paused', body: result.job.name })
    await load()
    setBusyId('')
  }

  const runNow = async (job: ScheduledJob) => {
    setBusyId(job.id)
    const response = await fetch('/api/admin/scheduled-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) notify({ tone: 'error', title: 'Manual run failed', body: result.error || `HTTP ${result.status}` })
    else notify({ tone: 'success', title: 'Manual run completed', body: job.name })
    await load()
    setBusyId('')
  }

  if (loading) return <AdminSkeleton rows={5} />

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <TimerReset className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Scheduled Jobs</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor cron jobs, last runs, failures, and production schedule configuration.
              </p>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Enabled jobs" value={enabled} tone="default" />
        <Metric label="Runs logged" value={runs.length} tone="default" />
        <Metric label="Failures" value={failures} tone={failures ? 'danger' : 'success'} />
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

      {jobs.length === 0 ? (
        <AdminEmptyState title="No jobs configured" body="Run the scheduled job migration to seed expiry reminders and automation runner jobs." />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-slate-950">{job.name}</h2>
                    <StatusBadge status={job.last_status} />
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${job.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {job.is_enabled ? 'Enabled' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{job.description}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => runNow(job)} disabled={busyId === job.id || !job.is_enabled} className="rounded-2xl border border-slate-200 p-3 text-slate-600 disabled:opacity-50" aria-label={`Run ${job.name}`}>
                    <Play className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggle(job)} disabled={busyId === job.id} className="rounded-2xl border border-slate-200 p-3 text-slate-600 disabled:opacity-50" aria-label={job.is_enabled ? `Pause ${job.name}` : `Enable ${job.name}`}>
                    <PauseCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Endpoint" value={job.endpoint} />
                <Info label="Cron" value={job.cron_expression} />
                <Info label="Last run" value={job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never'} />
                <Info label="Last success" value={job.last_success_at ? new Date(job.last_success_at).toLocaleString() : 'None'} />
              </div>
              {job.last_error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{job.last_error}</p> : null}
            </article>
          ))}
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-black text-slate-950">Recent Runs</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-3 py-3 font-black">Job</th>
                <th className="px-3 py-3 font-black">Status</th>
                <th className="px-3 py-3 font-black">Started</th>
                <th className="px-3 py-3 font-black">Duration</th>
                <th className="px-3 py-3 font-black">Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-slate-500">No job runs logged yet.</td></tr>
              ) : runs.map((run) => (
                <tr key={run.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4 font-black text-slate-950">{run.job_key}</td>
                  <td className="px-3 py-4"><StatusBadge status={run.status} /></td>
                  <td className="px-3 py-4 text-slate-600">{new Date(run.started_at).toLocaleString()}</td>
                  <td className="px-3 py-4 text-slate-600">{run.duration_ms ? `${run.duration_ms}ms` : '-'}</td>
                  <td className="px-3 py-4 text-slate-600">{run.error_message || JSON.stringify(run.metadata || {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'default' | 'success' | 'danger' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-950'
  return <div className={`rounded-3xl border p-5 shadow-sm ${styles}`}><p className="text-3xl font-black">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-[0.16em] opacity-70">{label}</p></div>
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === 'success' ? 'bg-emerald-100 text-emerald-700' : status === 'failed' ? 'bg-red-100 text-red-700' : status === 'running' ? 'bg-blue-100 text-blue-700' : status === 'skipped' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${styles}`}>{status}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 break-all font-bold text-slate-700">{value}</p></div>
}
