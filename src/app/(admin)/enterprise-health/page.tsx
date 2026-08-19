'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, CircleDashed, ExternalLink } from 'lucide-react'

type Check = {
  key: string
  title: string
  status: 'ready' | 'warning' | 'missing'
  detail: string
  href: string
}

type HealthData = {
  score: number
  checks: Check[]
  metrics: Record<string, number>
}

const STATUS_STYLES = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  missing: 'border-red-200 bg-red-50 text-red-700',
}

export default function EnterpriseHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/enterprise-health')
      const result = await response.json()
      if (!response.ok) setError(result.error || 'Unable to load enterprise health.')
      else setData(result)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <Panel>Loading enterprise health...</Panel>
  if (error || !data) return <Panel tone="danger">{error || 'Unable to load enterprise health.'}</Panel>

  const readyCount = data.checks.filter((item) => item.status === 'ready').length
  const warningCount = data.checks.filter((item) => item.status === 'warning').length
  const missingCount = data.checks.filter((item) => item.status === 'missing').length

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Enterprise Health</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                A live readiness check for the core reliability, branding, compliance, billing, and automation pieces.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-4 text-center">
            <p className="text-4xl font-black text-slate-950">{data.score}%</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Ready</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Ready" value={readyCount} tone="ready" />
        <Metric label="Needs Attention" value={warningCount} tone="warning" />
        <Metric label="Missing" value={missingCount} tone="missing" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {data.checks.map((item) => (
          <article key={item.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <StatusIcon status={item.status} />
                <div>
                  <h2 className="font-black text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${STATUS_STYLES[item.status]}`}>
                {item.status}
              </span>
            </div>
            <Link href={item.href} className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 hover:text-slate-950">
              Open area
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </section>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'ready' | 'warning' | 'missing' }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${STATUS_STYLES[tone]}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
    </div>
  )
}

function StatusIcon({ status }: { status: Check['status'] }) {
  if (status === 'ready') return <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
  if (status === 'warning') return <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
  return <CircleDashed className="mt-0.5 h-5 w-5 text-red-600" />
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>{children}</div>
}
