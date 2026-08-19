'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ListChecks } from 'lucide-react'

type ChecklistItem = {
  key: string
  label: string
  done: boolean
}

const LINKS: Record<string, string> = {
  brand: '/settings',
  favicon: '/settings',
  background: '/settings',
  package: '/settings',
  users: '/users/invite',
  staff: '/v2/staff/new',
  digital_id: '/v2/staff',
  documents: '/v2/staff',
  permissions: '/settings/permissions',
  support: '/settings',
}

export default function OnboardingChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/onboarding-checklist')
        const result = await response.json()
        if (!response.ok) {
          setError(result.error || 'Unable to load checklist.')
          return
        }
        setItems(result.items || [])
        setCompleted(result.completed || 0)
        setTotal(result.total || 0)
      } catch {
        setError('Unable to load checklist.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const percent = total ? Math.round((completed / total) * 100) : 0

  if (loading) return <Panel>Loading checklist...</Panel>
  if (error) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Onboarding Checklist</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                A simple setup path to make each organization reliable before daily use.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Progress</p>
            <p className="mt-1 text-2xl font-black">{percent}%</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-950" style={{ width: `${percent}%` }} />
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <Link key={item.key} href={LINKS[item.key] || '/dashboard'} className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                {item.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-slate-300" />}
                <span className={`font-bold ${item.done ? 'text-slate-500 line-through' : 'text-slate-950'}`}>{item.label}</span>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                {item.done ? 'Done' : 'Open'}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}
