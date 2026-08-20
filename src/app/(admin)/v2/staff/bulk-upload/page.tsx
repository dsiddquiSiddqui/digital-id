'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react'

type ImportError = {
  sheet: string
  parim_staff_id?: string
  row?: number
  message: string
}

type ImportStats = {
  staffCreated: number
  staffUpdated: number
  employmentInserted: number
  employmentUpdated: number
  addressInserted: number
  addressUpdated: number
  emergencyInserted: number
  emergencyUpdated: number
  bankInserted: number
  bankUpdated: number
  digitalIdInserted: number
  digitalIdUpdated: number
  documentsInserted: number
  documentsUpdated: number
  skipped: number
  failed: number
}

type ImportResponse = {
  success: boolean
  stats: ImportStats
  errors: ImportError[]
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export default function BulkUploadStaffPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResponse | null>(null)

  async function handleUpload() {
    if (!file) {
      setError('Please choose an Excel file first.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/staff/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Bulk upload failed')
      }

      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong during import')
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    window.open('/api/staff/bulk-upload/template', '_blank')
  }

  function downloadErrors() {
    if (!result?.errors.length) return
    const escape = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['Sheet', 'Row', 'PARiM Staff ID', 'Error'],
      ...result.errors.map((item) => [item.sheet, item.row || '', item.parim_staff_id || '', item.message]),
    ]
    const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'staff-import-errors.csv'
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const phase = result ? 2 : loading ? 1 : 0
  const linkedChanges = result ? result.stats.employmentInserted + result.stats.employmentUpdated + result.stats.addressInserted + result.stats.addressUpdated + result.stats.emergencyInserted + result.stats.emergencyUpdated + result.stats.bankInserted + result.stats.bankUpdated + result.stats.digitalIdInserted + result.stats.digitalIdUpdated + result.stats.documentsInserted + result.stats.documentsUpdated : 0

  return (
    <div className="dx-page space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/v2/staff" className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--dx-muted)] hover:text-[var(--dx-ink)]"><ArrowLeft className="h-4 w-4" /> Staff directory</Link>
        <button type="button" onClick={downloadTemplate} className="dx-button dx-button-secondary min-h-10 px-3 py-2"><Download className="h-4 w-4" /> Download template</button>
      </div>

      <header>
        <p className="dx-eyebrow">Bulk operations</p>
        <h1 className="dx-page-title">Import staff records</h1>
        <p className="dx-page-description">Use the Digital ID X workbook to create or update people, employment, contact, document and Digital ID records in one controlled import.</p>
      </header>

      <ol className="grid overflow-hidden rounded-xl border border-[var(--dx-line)] bg-white sm:grid-cols-3">
        {['Prepare file', 'Import & validate', 'Review results'].map((label, index) => <li key={label} className={`flex items-center gap-3 border-[var(--dx-line)] px-4 py-3 sm:border-r sm:last:border-r-0 ${index === phase ? 'bg-[var(--dx-signal-soft)] text-[var(--dx-signal)]' : index < phase ? 'text-emerald-700' : 'text-[var(--dx-muted)]'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${index <= phase ? 'bg-[var(--dx-signal)] text-white' : 'bg-[var(--dx-surface-muted)]'}`}>{index < phase ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}</span><span className="text-xs font-semibold">{label}</span></li>)}
      </ol>

      <section className="dx-surface p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--dx-line-strong)] bg-[var(--dx-surface-muted)] px-5 py-8 text-center transition hover:border-[var(--dx-signal)] hover:bg-[var(--dx-signal-soft)]">
            <UploadCloud className="h-7 w-7 text-[var(--dx-signal)]" />
            <span className="mt-3 text-sm font-bold text-[var(--dx-ink)]">{file?.name || 'Choose an Excel workbook'}</span>
            <span className="mt-1 text-xs text-[var(--dx-muted)]">.xlsx or .xls using the supplied template</span>
            <input type="file" accept=".xlsx,.xls" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); setError('') }} className="sr-only" />
          </label>
          <div className="rounded-xl border border-[var(--dx-line)] p-4">
            <FileSpreadsheet className="h-5 w-5 text-[var(--dx-muted-strong)]" />
            <h2 className="mt-3 text-sm font-bold text-[var(--dx-ink)]">Before importing</h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--dx-muted)]"><li>• Keep worksheet names unchanged.</li><li>• Use PARiM Staff ID to update existing records.</li><li>• Check dates and required employee codes.</li><li>• Errors will be reported by sheet and row.</li></ul>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="dx-button dx-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{loading ? 'Importing and validating…' : 'Start controlled import'}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="dx-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--dx-ink)]">Import summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Staff changed" value={result.stats.staffCreated + result.stats.staffUpdated} />
              <StatCard label="Linked records" value={linkedChanges} />
              <StatCard label="Skipped" value={result.stats.skipped} />
              <StatCard label="Failed" value={result.stats.failed} />
            </div>
            <details className="mt-4 rounded-lg border border-[var(--dx-line)] px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-[var(--dx-muted-strong)]">View detailed record totals</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Staff created" value={result.stats.staffCreated} /><StatCard label="Staff updated" value={result.stats.staffUpdated} /><StatCard label="Employment" value={result.stats.employmentInserted + result.stats.employmentUpdated} /><StatCard label="Addresses" value={result.stats.addressInserted + result.stats.addressUpdated} /><StatCard label="Emergency contacts" value={result.stats.emergencyInserted + result.stats.emergencyUpdated} /><StatCard label="Bank details" value={result.stats.bankInserted + result.stats.bankUpdated} /><StatCard label="Digital IDs" value={result.stats.digitalIdInserted + result.stats.digitalIdUpdated} /><StatCard label="Documents" value={result.stats.documentsInserted + result.stats.documentsUpdated} /></div></details>
          </div>

          {result.errors.length > 0 ? (
            <div className="dx-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[var(--dx-ink)]">Rows requiring attention</h2><button type="button" onClick={downloadErrors} className="dx-button dx-button-secondary min-h-9 px-3 py-2"><Download className="h-4 w-4" /> Download CSV</button></div>

              <div className="mt-4 space-y-3">
                {result.errors.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <strong>Sheet:</strong> {item.sheet}
                    {item.row ? (
                      <>
                        {' '}| <strong>Row:</strong> {item.row}
                      </>
                    ) : null}
                    {item.parim_staff_id ? (
                      <>
                        {' '}| <strong>Parim Staff ID:</strong> {item.parim_staff_id}
                      </>
                    ) : null}
                    {' '}| <strong>Error:</strong> {item.message}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
