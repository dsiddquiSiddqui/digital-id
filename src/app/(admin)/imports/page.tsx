'use client'

import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, TriangleAlert } from 'lucide-react'

type ImportBatch = {
  id: string
  file_name: string | null
  source: string
  status: string
  total_rows: number
  processed_rows: number
  failed_rows: number
  created_at: string
  completed_at: string | null
  profiles?: { full_name: string | null; email: string | null } | null
}

export default function ImportsPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/imports')
      const result = await response.json()
      if (!response.ok) setError(result.error || 'Unable to load imports.')
      else setBatches(result.batches || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Panel>Loading imports...</Panel>
  if (error) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Import History</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review bulk uploads, failed row counts, and download error reports.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {batches.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No imports recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">File</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Rows</th>
                  <th className="px-5 py-4">Failures</th>
                  <th className="px-5 py-4">Uploaded</th>
                  <th className="px-5 py-4 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{batch.file_name || 'Bulk upload'}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{batch.source}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600">{batch.status}</span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{batch.processed_rows}/{batch.total_rows}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${batch.failed_rows > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {batch.failed_rows > 0 ? <TriangleAlert className="h-3.5 w-3.5" /> : null}
                        {batch.failed_rows}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{new Date(batch.created_at).toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">
                      {batch.failed_rows > 0 ? (
                        <a href={`/api/admin/imports?batch_id=${batch.id}&format=csv`} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                          <Download className="h-3.5 w-3.5" />
                          Errors
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}
