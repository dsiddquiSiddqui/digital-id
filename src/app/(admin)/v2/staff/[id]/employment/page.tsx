'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Briefcase } from 'lucide-react'

type EmploymentRecord = {
  id: string
  staff_id: string
  employment_type: string | null
  contract_number: string | null
  contract_start: string | null
  contract_end: string | null
  pay_schedule: string | null
  payroll_reference: string | null
  tax_code: string | null
  ni_number: string | null
  personal_pay_rate: number | null
  is_current: boolean
}

type StaffSummary = {
  id: string
  full_name: string
  employee_code: string
}

export default function V2StaffEmploymentPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recordId, setRecordId] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffSummary | null>(null)

  const [employmentType, setEmploymentType] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [contractStart, setContractStart] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [paySchedule, setPaySchedule] = useState('')
  const [payrollReference, setPayrollReference] = useState('')
  const [taxCode, setTaxCode] = useState('')
  const [niNumber, setNiNumber] = useState('')
  const [personalPayRate, setPersonalPayRate] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [staffRes, employmentRes] = await Promise.all([
          fetch(`/api/v2/staff/${id}`),
          fetch(`/api/v2/staff/${id}/employment`),
        ])

        const staffJson = await staffRes.json()
        const employmentJson = await employmentRes.json()

        if (!staffRes.ok) {
          setError(staffJson.error || 'Failed to load staff member.')
          setLoading(false)
          return
        }

        setStaff(staffJson.staff)

        if (employmentRes.ok && employmentJson.employment) {
          const row: EmploymentRecord = employmentJson.employment

          setRecordId(row.id)
          setEmploymentType(row.employment_type || '')
          setContractNumber(row.contract_number || '')
          setContractStart(row.contract_start || '')
          setContractEnd(row.contract_end || '')
          setPaySchedule(row.pay_schedule || '')
          setPayrollReference(row.payroll_reference || '')
          setTaxCode(row.tax_code || '')
          setNiNumber(row.ni_number || '')
          setPersonalPayRate(
            row.personal_pay_rate !== null && row.personal_pay_rate !== undefined
              ? String(row.personal_pay_rate)
              : ''
          )
        }
      } catch {
        setError('Something went wrong while loading employment data.')
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

    if (contractStart && contractEnd && contractEnd <= contractStart) {
      setError('Contract end date must be later than contract start date.')
      setSaving(false)
      return
    }

    const parsedPayRate =
      personalPayRate.trim() === '' ? null : Number(personalPayRate)

    if (personalPayRate.trim() !== '' && Number.isNaN(parsedPayRate)) {
      setError('Personal pay rate must be a valid number.')
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`/api/v2/staff/${id}/employment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employment_type: employmentType.trim() || null,
          contract_number: contractNumber.trim() || null,
          contract_start: contractStart || null,
          contract_end: contractEnd || null,
          pay_schedule: paySchedule.trim() || null,
          payroll_reference: payrollReference.trim() || null,
          tax_code: taxCode.trim() || null,
          ni_number: niNumber.trim() || null,
          personal_pay_rate: parsedPayRate,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save employment record.')
        setSaving(false)
        return
      }

      if (result.employment?.id) {
        setRecordId(result.employment.id)
      }

      setSuccess(recordId ? 'Employment record updated successfully.' : 'Employment record created successfully.')
    } catch {
      setError('Something went wrong while saving employment data.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading employment details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Briefcase className="h-6 w-6 text-slate-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Employment
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {staff ? `${staff.full_name} (${staff.employee_code})` : 'Manage employment details'}
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
              Current Employment Record
            </h2>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Employment Type
            </label>
            <input
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Full-time / Part-time / Contractor"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contract Number
            </label>
            <input
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="CNT-1001"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contract Start
            </label>
            <input
              type="date"
              value={contractStart}
              onChange={(e) => setContractStart(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contract End
            </label>
            <input
              type="date"
              value={contractEnd}
              onChange={(e) => setContractEnd(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Pay Schedule
            </label>
            <input
              value={paySchedule}
              onChange={(e) => setPaySchedule(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Weekly / Monthly"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Payroll Reference
            </label>
            <input
              value={payrollReference}
              onChange={(e) => setPayrollReference(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="PAY-REF-001"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Tax Code
            </label>
            <input
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="1257L"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              NI Number
            </label>
            <input
              value={niNumber}
              onChange={(e) => setNiNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="QQ123456C"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Personal Pay Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={personalPayRate}
              onChange={(e) => setPersonalPayRate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="12.50"
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
              {saving ? 'Saving...' : recordId ? 'Update Employment' : 'Create Employment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}