'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type GuardIdRecord = {
  id: string
  guard_id: string
  id_number: string
  role_title: string
  site_name: string | null
  sia_number: string | null
  issue_date: string
  expiry_date: string
  is_current: boolean
  status: string | null
}

export default function EditDigitalIdPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [record, setRecord] = useState<GuardIdRecord | null>(null)

  const [idNumber, setIdNumber] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [siteName, setSiteName] = useState('')
  const [siaNumber, setSiaNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [status, setStatus] = useState('active')

  useEffect(() => {
    const loadRecord = async () => {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('guard_ids')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Digital ID not found.')
        setLoading(false)
        return
      }

      const row = data as GuardIdRecord

      setRecord(row)
      setIdNumber(row.id_number || '')
      setRoleTitle(row.role_title || '')
      setSiteName(row.site_name || '')
      setSiaNumber(row.sia_number || '')
      setIssueDate(row.issue_date || '')
      setExpiryDate(row.expiry_date || '')
      setStatus(row.status || 'active')

      setLoading(false)
    }

    if (id) {
      loadRecord()
    }
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!idNumber.trim() || !roleTitle.trim() || !issueDate || !expiryDate || !status) {
      setError('Please fill in all required fields.')
      return
    }

    if (expiryDate <= issueDate) {
      setError('Expiry date must be later than issue date.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/update-guard-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          id_number: idNumber.trim(),
          role_title: roleTitle.trim(),
          site_name: siteName.trim() || null,
          sia_number: siaNumber.trim() || null,
          issue_date: issueDate,
          expiry_date: expiryDate,
          status,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update digital ID.')
        setSaving(false)
        return
      }

      setSuccess('Digital ID updated successfully.')

      setTimeout(() => {
        router.push(`/guards/${record?.guard_id}`)
        router.refresh()
      }, 700)
    } catch (err) {
      setError('Something went wrong while updating the digital ID.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-slate-600">Loading digital ID...</p>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <p className="text-sm text-slate-600">Digital ID not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Digital ID
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the current digital ID details for this guard.
            </p>
          </div>

          <Link
            href={`/guards/${record.guard_id}`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Guard
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ID Number
            </label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="ID-1001"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Role Title
            </label>
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Door Supervisor"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Site Name
            </label>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Canary Wharf"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              SIA Number
            </label>
            <input
              value={siaNumber}
              onChange={(e) => setSiaNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="SIA-874221"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Issue Date
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              required
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ID Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
              <option value="revoked">revoked</option>
              <option value="expired">expired</option>
            </select>
          </div>

          {error ? (
            <div className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Digital ID'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}