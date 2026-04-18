'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CreditCard } from 'lucide-react'

type StaffSummary = {
  id: string
  full_name: string
  employee_code: string
}

type BankDetailsRecord = {
  id: string
  staff_id: string
  account_holder_name: string | null
  bank_account_number: string | null
  sort_code: string | null
  reference_number: string | null
}

export default function V2StaffBankDetailsPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recordId, setRecordId] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffSummary | null>(null)

  const [accountHolderName, setAccountHolderName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [sortCode, setSortCode] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [staffRes, bankRes] = await Promise.all([
          fetch(`/api/v2/staff/${id}`),
          fetch(`/api/v2/staff/${id}/bank-details`),
        ])

        const staffJson = await staffRes.json()
        const bankJson = await bankRes.json()

        if (!staffRes.ok) {
          setError(staffJson.error || 'Failed to load staff member.')
          setLoading(false)
          return
        }

        setStaff(staffJson.staff)

        if (bankRes.ok && bankJson.bank_details) {
          const row: BankDetailsRecord = bankJson.bank_details
          setRecordId(row.id)
          setAccountHolderName(row.account_holder_name || '')
          setBankAccountNumber(row.bank_account_number || '')
          setSortCode(row.sort_code || '')
          setReferenceNumber(row.reference_number || '')
        }
      } catch {
        setError('Something went wrong while loading bank details.')
      } finally {
        setLoading(false)
      }
    }

    if (id) loadData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/v2/staff/${id}/bank-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_holder_name: accountHolderName.trim() || null,
          bank_account_number: bankAccountNumber.trim() || null,
          sort_code: sortCode.trim() || null,
          reference_number: referenceNumber.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save bank details.')
        setSaving(false)
        return
      }

      if (result.bank_details?.id) {
        setRecordId(result.bank_details.id)
      }

      setSuccess(recordId ? 'Bank details updated successfully.' : 'Bank details created successfully.')
    } catch {
      setError('Something went wrong while saving bank details.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading bank details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <CreditCard className="h-6 w-6 text-slate-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Bank Details
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {staff ? `${staff.full_name} (${staff.employee_code})` : 'Manage bank details'}
              </p>
            </div>
          </div>

          <Link
            href={`/v2/staff/${id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Staff
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Current Bank Details
            </h2>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Account Holder Name
            </label>
            <input
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Full account holder name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Bank Account Number
            </label>
            <input
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="12345678"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Sort Code
            </label>
            <input
              value={sortCode}
              onChange={(e) => setSortCode(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="12-34-56"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Reference Number
            </label>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Optional reference number"
            />
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
              {saving ? 'Saving...' : recordId ? 'Update Bank Details' : 'Create Bank Details'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}