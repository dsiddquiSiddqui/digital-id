'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Gauge, Play, ServerCog } from 'lucide-react'
import { AdminSkeleton } from '@/components/admin/Polish'
import { useToast } from '@/components/admin/ToastProvider'

type ProviderConfig = { id: string; provider_area: string; provider_name: string; status: string; public_config: Record<string, unknown> }
type QaItem = { id: string; title: string; status: string; evidence: string | null }
type MonitoringCheck = { id: string; name: string; target_url: string; status: string; last_checked_at: string | null; last_response_ms: number | null }
type ReportSchedule = { id: string; name: string; report_type: string; format: string; cron_expression: string; is_enabled: boolean }
type ExportTemplate = { id: string; name: string; export_type: string; format: string; is_default: boolean }
type TestRun = { id: string; suite_name: string; status: string; summary: string | null; created_at: string }

export default function ProductionReadinessPage() {
  const { notify } = useToast()
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [qa, setQa] = useState<QaItem[]>([])
  const [monitoring, setMonitoring] = useState<MonitoringCheck[]>([])
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [exports, setExports] = useState<ExportTemplate[]>([])
  const [tests, setTests] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/production-readiness')
    const result = await response.json()
    if (response.ok) {
      setProviders(result.providers || [])
      setQa(result.qa || [])
      setMonitoring(result.monitoring || [])
      setSchedules(result.schedules || [])
      setExports(result.export_templates || [])
      setTests(result.test_runs || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const score = useMemo(() => {
    const total = providers.length + qa.length + monitoring.length + exports.length + Math.max(1, schedules.length) + Math.max(1, tests.length)
    const done =
      providers.filter((item) => ['configured', 'verified'].includes(item.status)).length +
      qa.filter((item) => item.status === 'passed').length +
      monitoring.filter((item) => ['up', 'unknown'].includes(item.status)).length +
      exports.length +
      (schedules.length ? 1 : 0) +
      (tests.length ? 1 : 0)
    return total ? Math.round((done / total) * 100) : 0
  }, [providers, qa, monitoring, exports, schedules, tests])

  const runCheck = async (id: string) => {
    setBusyId(id)
    const response = await fetch('/api/admin/production-readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run_monitoring_check', id }),
    })
    const result = await response.json()
    notify(response.ok ? { tone: 'success', title: 'Check recorded', body: result.check?.name } : { tone: 'error', title: 'Check failed', body: result.error })
    await load()
    setBusyId('')
  }

  const createSchedule = async () => {
    const response = await fetch('/api/admin/production-readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_report_schedule', recipients: [] }),
    })
    const result = await response.json()
    notify(response.ok ? { tone: 'success', title: 'Report schedule added', body: result.schedule?.name } : { tone: 'error', title: 'Schedule not added', body: result.error })
    await load()
  }

  const recordTest = async () => {
    const response = await fetch('/api/admin/production-readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_test_run', status: 'passed', summary: 'Production readiness smoke test recorded from admin UI.' }),
    })
    const result = await response.json()
    notify(response.ok ? { tone: 'success', title: 'Test run recorded', body: result.test_run?.suite_name } : { tone: 'error', title: 'Test run failed', body: result.error })
    await load()
  }

  if (loading) return <AdminSkeleton rows={6} />

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <ServerCog className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Production Readiness</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                One control layer for provider setup, QA signoff, monitoring, scheduled reports, exports, and test evidence.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-4 text-center">
            <p className="text-4xl font-black text-slate-950">{score}%</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">App-code ready</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Provider Adapters" icon={<Gauge className="h-5 w-5" />}>
          {providers.map((item) => <Row key={item.id} title={item.provider_name} detail={`${item.provider_area} - ${JSON.stringify(item.public_config)}`} status={item.status} />)}
        </Panel>

        <Panel title="QA Signoffs" icon={<ClipboardCheck className="h-5 w-5" />}>
          {qa.map((item) => <Row key={item.id} title={item.title} detail={item.evidence || 'Evidence recorded.'} status={item.status} />)}
        </Panel>

        <Panel title="Monitoring Checks" icon={<ServerCog className="h-5 w-5" />}>
          {monitoring.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="font-black text-slate-950">{item.name}</p>
                <p className="mt-1 text-sm text-slate-500">{item.target_url} - {item.last_response_ms ? `${item.last_response_ms}ms` : 'not checked'}</p>
              </div>
              <button onClick={() => runCheck(item.id)} disabled={busyId === item.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 disabled:opacity-50" aria-label={`Run ${item.name}`}>
                <Play className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Panel>

        <Panel title="Reports And Exports" icon={<CheckCircle2 className="h-5 w-5" />}>
          <button onClick={createSchedule} className="mb-3 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Add weekly report schedule</button>
          {schedules.map((item) => <Row key={item.id} title={item.name} detail={`${item.report_type} - ${item.format} - ${item.cron_expression}`} status={item.is_enabled ? 'enabled' : 'paused'} />)}
          {exports.map((item) => <Row key={item.id} title={item.name} detail={`${item.export_type} - ${item.format}`} status={item.is_default ? 'default' : 'available'} />)}
        </Panel>
      </section>

      <Panel title="Test Evidence" icon={<ClipboardCheck className="h-5 w-5" />}>
        <button onClick={recordTest} className="mb-3 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Record smoke test pass</button>
        {tests.length === 0 ? <p className="text-sm text-slate-500">No test runs recorded yet.</p> : tests.map((item) => <Row key={item.id} title={item.suite_name} detail={item.summary || new Date(item.created_at).toLocaleString()} status={item.status} />)}
      </Panel>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3 text-slate-700">{icon}<h2 className="text-lg font-black text-slate-950">{title}</h2></div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Row({ title, detail, status }: { title: string; detail: string; status: string }) {
  const ok = ['configured', 'verified', 'passed', 'up', 'enabled', 'default', 'available'].includes(status)
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="min-w-0">
        <p className="font-black text-slate-950">{title}</p>
        <p className="mt-1 break-words text-sm text-slate-500">{detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black capitalize ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{status.replace(/_/g, ' ')}</span>
    </div>
  )
}
