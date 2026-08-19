'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardCheck, ExternalLink, XCircle } from 'lucide-react'

type Renewal = {
  id: string
  status: string
  file_url: string | null
  document_number: string | null
  expiry_date: string | null
  notes: string | null
  submitted_at: string
  staff?: { full_name: string; employee_code: string } | null
  document_types?: { name: string; code: string } | null
}

export default function DocumentRenewalsPage() {
  const [renewals, setRenewals] = useState<Renewal[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/document-renewals')
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to load renewals.')
    else setRenewals(result.renewals || [])
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const review = async (id: string, status: 'approved' | 'rejected') => {
    const review_notes = status === 'rejected' ? window.prompt('Reason for rejection?') || '' : ''
    setSavingId(id)
    setError('')
    const response = await fetch('/api/admin/document-renewals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, review_notes }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to update renewal.')
    await load()
    setSavingId('')
  }

  const pending = renewals.filter((item) => item.status === 'pending').length

  if (loading) return <Panel>Loading renewal requests...</Panel>
  if (error && renewals.length === 0) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Document Renewals</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {pending} pending request{pending === 1 ? '' : 's'} waiting for approval.
            </p>
          </div>
        </div>
      </section>

      {error ? <Panel tone="danger">{error}</Panel> : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {renewals.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No renewal requests yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {renewals.map((renewal) => {
              const documentType = Array.isArray(renewal.document_types)
                ? renewal.document_types[0]
                : renewal.document_types
              const staff = Array.isArray(renewal.staff) ? renewal.staff[0] : renewal.staff

              return (
                <div key={renewal.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-black text-slate-950">{staff?.full_name || 'Unknown staff'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {staff?.employee_code || 'No code'} - {documentType?.name || 'Document'}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        {renewal.status} {renewal.expiry_date ? `- expires ${renewal.expiry_date}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {renewal.file_url ? (
                        <a href={renewal.file_url} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">
                          <ExternalLink className="h-3.5 w-3.5" />
                          View file
                        </a>
                      ) : null}
                      {renewal.status === 'pending' ? (
                        <>
                          <button disabled={savingId === renewal.id} onClick={() => review(renewal.id, 'approved')} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button disabled={savingId === renewal.id} onClick={() => review(renewal.id, 'rejected')} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}
