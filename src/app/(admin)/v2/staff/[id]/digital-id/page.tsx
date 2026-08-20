'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarDays, Download, IdCard as IdCardIcon, ShieldCheck } from 'lucide-react'
import IdCard from '@/components/IdCard'

type StaffRecord = {
  id: string
  full_name: string
  employee_code: string
  photo_url: string | null
}

type DigitalIdRecord = {
  id: string
  id_number: string
  role_title: string
  status: string
  sia_number: string | null
  qr_token: string
  issue_date: string
  expiry_date: string
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export default function StaffDigitalIdPage() {
  const params = useParams<{ id: string }>()
  const staffId = params.id
  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [digitalId, setDigitalId] = useState<DigitalIdRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [staffResponse, idResponse] = await Promise.all([
          fetch(`/api/v2/staff/${staffId}`),
          fetch(`/api/v2/staff/${staffId}/digital-id`),
        ])
        const staffResult = await staffResponse.json()
        const idResult = await idResponse.json()
        if (!staffResponse.ok) {
          setError(staffResult.error || 'Unable to load staff information.')
          return
        }
        setStaff(staffResult.staff)
        setDigitalId(idResponse.ok ? idResult.digital_id || null : null)
      } catch {
        setError('Unable to load the Digital ID workspace.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [staffId])

  const exportPdf = async () => {
    if (!staff) return
    setExporting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/id-card-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staff.id }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setError(result.error || 'Unable to export the ID card.')
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `digital-id-${staff.employee_code}.pdf`
      anchor.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Unable to export the ID card.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="dx-surface h-72 animate-pulse" />
  if (!staff) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error || 'Staff member not found.'}</div>

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dx-eyebrow">Identity</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--dx-ink)]">Digital ID</h2>
          <p className="mt-2 text-sm text-[var(--dx-muted)]">Issue, inspect and maintain the current identity credential.</p>
        </div>
        <Link href={digitalId ? `/v2/staff-ids/${digitalId.id}/edit` : `/v2/staff/${staff.id}/issue-id`} className="dx-button dx-button-primary">
          {digitalId ? 'Manage Digital ID' : 'Issue Digital ID'}
        </Link>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

      {digitalId ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="dx-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--dx-muted)]">Current credential</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--dx-ink)]">{digitalId.id_number}</h3>
              </div>
              <span className="dx-status dx-status-success">{digitalId.status}</span>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <Detail label="Role title" value={digitalId.role_title} />
              <Detail label="SIA number" value={digitalId.sia_number || 'Not supplied'} />
              <Detail label="Issue date" value={formatDate(digitalId.issue_date)} />
              <Detail label="Expiry date" value={formatDate(digitalId.expiry_date)} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--dx-line)] pt-5">
              <Link href={`/v2/staff-ids/${digitalId.id}/edit`} className="dx-button dx-button-secondary"><ShieldCheck className="h-4 w-4" /> Edit credential</Link>
              <button type="button" onClick={exportPdf} disabled={exporting} className="dx-button dx-button-secondary disabled:cursor-not-allowed disabled:opacity-60"><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export PDF'}</button>
            </div>
          </section>

          <section className="dx-surface overflow-hidden p-5 sm:p-6">
            <p className="mb-4 text-sm font-semibold text-[var(--dx-muted-strong)]">Credential preview</p>
            <IdCard fullName={staff.full_name} employeeCode={staff.employee_code} roleTitle={digitalId.role_title} idNumber={digitalId.id_number} siaNumber={digitalId.sia_number} qrToken={digitalId.qr_token} photoUrl={staff.photo_url} issueDate={formatDate(digitalId.issue_date)} expiryDate={formatDate(digitalId.expiry_date)} idStatus={digitalId.status} />
          </section>
        </div>
      ) : (
        <section className="dx-surface flex flex-col items-center px-5 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><IdCardIcon className="h-6 w-6" /></span>
          <h3 className="mt-4 text-lg font-bold text-[var(--dx-ink)]">No Digital ID has been issued</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--dx-muted)]">Review the profile and required documents, then issue the first credential.</p>
          <Link href={`/v2/staff/${staff.id}/issue-id`} className="dx-button dx-button-primary mt-5"><CalendarDays className="h-4 w-4" /> Start issuance</Link>
        </section>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[var(--dx-surface-muted)] px-4 py-3"><dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--dx-muted)]">{label}</dt><dd className="mt-1.5 text-sm font-semibold text-[var(--dx-ink)]">{value}</dd></div>
}
