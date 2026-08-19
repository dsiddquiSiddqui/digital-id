'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarClock, FileWarning } from 'lucide-react'

type AlertRow = {
  id: string
  type: string
  label: string
  reference: string | null
  expiry_date: string
  days_until: number
  status: string
  staff?: { id: string; full_name: string; employee_code: string } | null
}

export default function ExpiryAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [summary, setSummary] = useState({ expired: 0, due_soon: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/expiry-alerts')
        const result = await response.json()
        if (!response.ok) {
          setError(result.error || 'Unable to load expiry alerts.')
          return
        }
        setAlerts(result.alerts || [])
        setSummary((current) => result.summary || current)
      } catch {
        setError('Unable to load expiry alerts.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Panel>Loading expiry alerts...</Panel>
  if (error) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Expiry Alerts</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Staff documents and digital IDs expiring within 30 days or already expired.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total alerts" value={summary.total} />
        <Metric label="Expired" value={summary.expired} danger />
        <Metric label="Due soon" value={summary.due_soon} />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No upcoming expiries found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <div key={`${alert.type}-${alert.id}`} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl p-3 ${alert.days_until < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {alert.days_until < 0 ? <AlertTriangle className="h-5 w-5" /> : <FileWarning className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-black text-slate-950">{alert.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {alert.staff?.full_name || 'Unknown staff'} {alert.staff?.employee_code ? `- ${alert.staff.employee_code}` : ''}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      {alert.reference || alert.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {alert.days_until < 0 ? `${Math.abs(alert.days_until)} days overdue` : `${alert.days_until} days left`}
                  </span>
                  {alert.staff?.id ? (
                    <Link href={`/v2/staff/${alert.staff.id}/documents`} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${danger ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <p className={`text-sm font-bold ${danger ? 'text-red-700' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-3 text-3xl font-black ${danger ? 'text-red-900' : 'text-slate-950'}`}>{value}</p>
    </div>
  )
}
