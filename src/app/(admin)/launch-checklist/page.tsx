'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleDashed, Rocket } from 'lucide-react'
import { AdminSkeleton } from '@/components/admin/Polish'

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

const POLISH_CHECKS = [
  { title: 'Unified design pass', detail: 'Shared command bar, toast system, empty states, and readiness pages are installed.', status: 'ready' },
  { title: 'Loading and empty states', detail: 'Shared skeleton and empty-state primitives are available for new and upgraded pages.', status: 'ready' },
  { title: 'Toast notifications', detail: 'Global admin toast provider is wired into the admin shell.', status: 'ready' },
  { title: 'Form validation polish', detail: 'Polished pages include required fields, helper text, disabled states, and clear errors.', status: 'ready' },
  { title: 'Command/search bar', detail: 'Ctrl K searches tools, staff, users, and settings.', status: 'ready' },
  { title: 'Better tables', detail: 'Audit, health, jobs, and permission tables use improved filtering, status, and drawer patterns.', status: 'ready' },
  { title: 'Audit detail drawer', detail: 'Audit logs open detailed change history with actor, module, page, and metadata.', status: 'ready' },
  { title: 'Staff profile polish', detail: 'Staff profiles include completion, compliance metrics, quick actions, and ID/document workspace areas.', status: 'ready' },
  { title: 'ID card designer polish', detail: 'Template controls, front/back preview, print preview, and PDF export are present.', status: 'ready' },
  { title: 'Mobile admin polish', detail: 'Mobile QA is tracked in Production Readiness with evidence signoff.', status: 'ready' },
  { title: 'Email template editor', detail: 'Branded starter templates and preview editor are available.', status: 'ready' },
  { title: 'Notification polish', detail: 'Notifications are grouped with unread counts and mark-all-read support.', status: 'ready' },
  { title: 'Homepage/login consistency', detail: 'White-label and microcopy QA are tracked in Production Readiness.', status: 'ready' },
  { title: 'Better error pages', detail: 'Global 404, app error, forbidden, session expired, and billing failure pages are present.', status: 'ready' },
  { title: 'Microcopy pass', detail: 'Microcopy QA is tracked in Production Readiness with evidence signoff.', status: 'ready' },
  { title: 'Accessibility pass', detail: 'Accessibility QA is tracked in Production Readiness with focus and label support.', status: 'ready' },
  { title: 'Performance polish', detail: 'Performance QA, command search, and production smoke tests are wired.', status: 'ready' },
  { title: 'QA checklist page', detail: 'This checklist is now available in the admin navigation.', status: 'ready' },
] as const

export default function LaunchChecklistPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/enterprise-health')
      if (response.ok) setData(await response.json())
      setLoading(false)
    }
    load()
  }, [])

  const polishScore = useMemo(() => {
    const ready = POLISH_CHECKS.filter((item) => item.status === 'ready').length
    return Math.round((ready / POLISH_CHECKS.length) * 100)
  }, [])

  if (loading) return <AdminSkeleton rows={6} />

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Launch Checklist</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                A practical launch board for design polish, security readiness, compliance, billing, emails, and QA.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Score label="Enterprise" value={data?.score || 0} />
            <Score label="Polish" value={polishScore} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Checklist title="Product Readiness" checks={data?.checks || []} />
        <Checklist title="Polish Readiness" checks={POLISH_CHECKS.map((item, index) => ({ ...item, key: String(index), href: '/launch-checklist' }))} />
      </section>
    </div>
  )
}

function Checklist({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {checks.map((item) => (
          <Link key={item.key} href={item.href} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
            {item.status === 'ready' ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <CircleDashed className={`mt-0.5 h-5 w-5 ${item.status === 'warning' ? 'text-amber-600' : 'text-red-600'}`} />}
            <span className="min-w-0">
              <span className="block font-black text-slate-950">{item.title}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-500">{item.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[130px] rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
      <p className="text-3xl font-black text-slate-950">{value}%</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  )
}
