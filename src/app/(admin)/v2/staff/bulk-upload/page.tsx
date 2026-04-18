'use client'

import { useState } from 'react'

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
    } catch (err: any) {
      setError(err?.message || 'Something went wrong during import')
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    window.open('/api/staff/bulk-upload/template', '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Bulk Upload Staff</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Upload staff and linked records using one Excel file. This version is matched to your
          real tables: staff, staff_employment, staff_addresses, staff_emergency_contacts,
          staff_bank_details, staff_ids, and staff_documents.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Download Template
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">Upload Excel file</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full rounded-lg border border-slate-300 p-3 text-sm"
        />

        {file ? (
          <p className="mt-3 text-sm text-slate-600">
            Selected file: <span className="font-medium">{file.name}</span>
          </p>
        ) : null}

        <div className="mt-5">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Start Bulk Import'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Import Summary</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              <StatCard label="Staff Created" value={result.stats.staffCreated} />
              <StatCard label="Staff Updated" value={result.stats.staffUpdated} />
              <StatCard label="Employment Inserted" value={result.stats.employmentInserted} />
              <StatCard label="Employment Updated" value={result.stats.employmentUpdated} />
              <StatCard label="Address Inserted" value={result.stats.addressInserted} />
              <StatCard label="Address Updated" value={result.stats.addressUpdated} />
              <StatCard label="Emergency Inserted" value={result.stats.emergencyInserted} />
              <StatCard label="Emergency Updated" value={result.stats.emergencyUpdated} />
              <StatCard label="Bank Inserted" value={result.stats.bankInserted} />
              <StatCard label="Bank Updated" value={result.stats.bankUpdated} />
              <StatCard label="Digital IDs Inserted" value={result.stats.digitalIdInserted} />
              <StatCard label="Digital IDs Updated" value={result.stats.digitalIdUpdated} />
              <StatCard label="Documents Inserted" value={result.stats.documentsInserted} />
              <StatCard label="Documents Updated" value={result.stats.documentsUpdated} />
              <StatCard label="Skipped" value={result.stats.skipped} />
              <StatCard label="Failed" value={result.stats.failed} />
            </div>
          </div>

          {result.errors.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Import Errors</h2>

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
