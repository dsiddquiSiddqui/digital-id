'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, Circle, FileWarning } from 'lucide-react'

type ChecklistRow = {
  document_type: { id: string; name: string; code: string; is_mandatory: boolean; has_expiry: boolean }
  document: { id: string; status: string; expiry_date: string | null; file_url: string | null } | null
  done: boolean
  expired: boolean
  required: boolean
}

export default function StaffDocumentChecklistPage() {
  const params = useParams<{ id: string }>()
  const staffId = params.id
  const [staff, setStaff] = useState<{ full_name: string; employee_code: string } | null>(null)
  const [rows, setRows] = useState<ChecklistRow[]>([])
  const [summary, setSummary] = useState({ completed: 0, total: 0, required_missing: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/v2/staff/${staffId}/document-checklist`)
        const result = await response.json()
        if (!response.ok) {
          setError(result.error || 'Unable to load document checklist.')
          return
        }
        setStaff(result.staff)
        setRows(result.checklist || [])
        setSummary({
          completed: result.completed || 0,
          total: result.total || 0,
          required_missing: result.required_missing || 0,
        })
      } catch {
        setError('Unable to load document checklist.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [staffId])

  const percent = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0

  if (loading) return <Panel>Loading checklist...</Panel>
  if (error) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dx-eyebrow">Compliance</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--dx-ink)]">Document checklist</h2>
          <p className="mt-2 text-sm text-[var(--dx-muted)]">Track required and optional records for {staff?.full_name || 'this staff member'}.</p>
        </div>
        <Link href={`/v2/staff/${staffId}/documents`} className="dx-button dx-button-primary">Manage documents</Link>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Complete" value={`${percent}%`} />
        <Metric label="Uploaded" value={`${summary.completed}/${summary.total}`} />
        <Metric label="Required missing" value={String(summary.required_missing)} danger={summary.required_missing > 0} />
      </div>

      <section className="dx-surface p-5 sm:p-6">
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.document_type.id} className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {row.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : row.expired ? <FileWarning className="h-5 w-5 text-red-600" /> : <Circle className="h-5 w-5 text-slate-300" />}
                <div>
                  <p className="font-black text-slate-950">{row.document_type.name}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{row.document_type.code}</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${row.done ? 'bg-emerald-100 text-emerald-700' : row.expired ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                {row.done ? 'Complete' : row.expired ? 'Expired' : row.required ? 'Required' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${danger ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <p className={`text-sm font-bold ${danger ? 'text-red-700' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-3 text-3xl font-black ${danger ? 'text-red-900' : 'text-slate-950'}`}>{value}</p>
    </div>
  )
}
