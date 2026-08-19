'use client'

import { useEffect, useState } from 'react'
import { Download, FileBarChart, Shield, Users, FileWarning } from 'lucide-react'

type ReportsData = {
  usage: {
    usage: { users: number; staff: number; activeIds: number; documents: number }
    plan: { name: string }
  }
  metrics: { activeStaff: number; expiredDocuments: number; revokedIds: number }
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/reports')
        const result = await response.json()
        if (!response.ok) {
          setError(result.error || 'Unable to load reports.')
          return
        }
        setData(result)
      } catch {
        setError('Unable to load reports.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Panel>Loading reports...</Panel>
  if (error) return <Panel tone="danger">{error}</Panel>
  if (!data) return null

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Reports</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Export operational data and review compliance health from one place.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Users className="h-5 w-5" />} label="Active staff" value={data.metrics.activeStaff} />
        <Metric icon={<Shield className="h-5 w-5" />} label="Active IDs" value={data.usage.usage.activeIds} />
        <Metric icon={<FileWarning className="h-5 w-5" />} label="Expired documents" value={data.metrics.expiredDocuments} danger />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <ExportCard title="Staff report" desc="Staff directory with status, contact, and company fields." href="/api/admin/reports?format=csv&type=staff" />
        <ExportCard title="Expired documents" desc="All expired documents with staff reference and expiry date." href="/api/admin/reports?format=csv&type=expired-documents" />
        <ExportCard title="Organization backup" desc="JSON export of core tenant data for backup and migration." href="/api/admin/exports" />
        <ExportCard title="Audit log CSV" desc="CSV export of audit activity for compliance review." href="/api/admin/exports?format=csv&type=audit_logs" />
        <ExportCard title="Branded staff PDF" desc="Branded PDF summary for staff reporting." href="/api/admin/exports?format=pdf&type=staff" />
        <ExportCard title="Branded audit PDF" desc="Branded PDF summary for audit reporting." href="/api/admin/exports?format=pdf&type=audit_logs" />
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}

function Metric({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${danger ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-bold ${danger ? 'text-red-700' : 'text-slate-500'}`}>{label}</p>
        <span className={`rounded-2xl p-3 ${danger ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{icon}</span>
      </div>
      <p className={`mt-4 text-3xl font-black ${danger ? 'text-red-900' : 'text-slate-950'}`}>{value.toLocaleString()}</p>
    </div>
  )
}

function ExportCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a href={href} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400">
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
      </div>
      <span className="rounded-2xl bg-slate-950 p-3 text-white">
        <Download className="h-5 w-5" />
      </span>
    </a>
  )
}
