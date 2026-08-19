'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AdminSkeleton } from '@/components/admin/Polish'

type AuditItem = {
  area: string
  routes: string
  guard: string
  status: 'covered' | 'needs_review'
}

export default function PermissionAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [summary, setSummary] = useState({ covered: 0, needsReview: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/permission-audit')
      const result = await response.json()
      if (!response.ok) setError(result.error || 'Unable to load permission audit.')
      else {
        setItems(result.items || [])
        setSummary(result.summary || { covered: 0, needsReview: 0, total: 0 })
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <AdminSkeleton rows={5} />

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Permission Audit</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Cross-check API areas, expected guards, and routes that still need line-by-line review.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Total areas" value={summary.total} />
        <Metric label="Covered" value={summary.covered} />
        <Metric label="Needs review" value={summary.needsReview} tone="warning" />
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-5 py-4 font-black">Area</th>
                <th className="px-5 py-4 font-black">Routes</th>
                <th className="px-5 py-4 font-black">Expected guard</th>
                <th className="px-5 py-4 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.area} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-4 font-black text-slate-950">{item.area}</td>
                  <td className="px-5 py-4 text-slate-600">{item.routes}</td>
                  <td className="px-5 py-4 text-slate-600">{item.guard}</td>
                  <td className="px-5 py-4"><Status status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' }) {
  const styles = tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-950'
  return <div className={`rounded-3xl border p-5 shadow-sm ${styles}`}><p className="text-3xl font-black">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-[0.16em] opacity-70">{label}</p></div>
}

function Status({ status }: { status: AuditItem['status'] }) {
  const styles = status === 'covered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
  return <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${styles}`}>{status.replace('_', ' ')}</span>
}
