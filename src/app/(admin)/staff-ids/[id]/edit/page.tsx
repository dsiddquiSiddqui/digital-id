'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type StaffIdRecord = {
  id: string
  staff_id: string
  id_number: string
  role_title: string
  site_name: string | null
  sia_number: string | null
  issue_date: string
  expiry_date: string
  is_current: boolean
  status: string | null
}

const ROLE_OPTIONS = {
  security: [
    'Door Supervisor',
    'Security Officer',
    'CCTV Operator',
    'Close Protection Officer',
    'Event Security Officer',
    'Event Steward',
    'Crowd Safety Steward',
    'Event Response Officer',
    'Emergency Response Officer',
    'Festival Security Staff',
    'Mobile Patrol Officer',
    'Key Holding Response Officer',
    'Alarm Response Officer',
    'Rapid Response Officer',
    'Loss Prevention Officer',
    'Retail Security Officer',
    'Reception Security Officer',
    'Gatehouse Security Officer',
    'Security Supervisor',
    'Event Security Supervisor',
    'Control Room Supervisor',
  ],
  warehouse: [
    'Warehouse Operative',
    'Picker Packer',
    'Forklift Driver',
    'Warehouse Supervisor',
    'Goods In Operative',
    'Goods Out Operative',
    'Inventory Controller',
    'Loading Bay Operative',
  ],
  hospitality: [
    'Waiter / Waitress',
    'Bartender',
    'Bar Back',
    'Kitchen Porter',
    'Chef',
    'Front of House',
    'Housekeeping Staff',
    'Event Staff',
  ],
} as const

type StaffCategory = 'security' | 'warehouse' | 'hospitality' | ''
const CUSTOM_ROLE_VALUE = '__custom__'

export default function EditDigitalIdPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [record, setRecord] = useState<StaffIdRecord | null>(null)

  const [idNumber, setIdNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [status, setStatus] = useState('active')

  const [staffCategory, setStaffCategory] = useState<StaffCategory>('')
  const [selectedRole, setSelectedRole] = useState('')
  const [customRoleTitle, setCustomRoleTitle] = useState('')
  const [roleTitle, setRoleTitle] = useState('')

  const [requiresSia, setRequiresSia] = useState(false)
  const [siaNumber, setSiaNumber] = useState('')

  const roleOptions =
    staffCategory && staffCategory in ROLE_OPTIONS
      ? ROLE_OPTIONS[staffCategory as keyof typeof ROLE_OPTIONS]
      : []

  useEffect(() => {
    const loadRecord = async () => {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('staff_ids')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Digital ID not found.')
        setLoading(false)
        return
      }

      const row = data as StaffIdRecord
      const savedRole = row.role_title || ''

      setRecord(row)
      setIdNumber(row.id_number || '')
      setRoleTitle(savedRole)
      setSiaNumber(row.sia_number || '')
      setIssueDate(row.issue_date || '')
      setExpiryDate(row.expiry_date || '')
      setStatus(row.status || 'active')
      setRequiresSia(Boolean(row.sia_number))

      if (ROLE_OPTIONS.security.includes(savedRole as (typeof ROLE_OPTIONS.security)[number])) {
        setStaffCategory('security')
        setSelectedRole(savedRole)
      } else if (
        ROLE_OPTIONS.warehouse.includes(savedRole as (typeof ROLE_OPTIONS.warehouse)[number])
      ) {
        setStaffCategory('warehouse')
        setSelectedRole(savedRole)
      } else if (
        ROLE_OPTIONS.hospitality.includes(savedRole as (typeof ROLE_OPTIONS.hospitality)[number])
      ) {
        setStaffCategory('hospitality')
        setSelectedRole(savedRole)
      } else if (savedRole) {
        setSelectedRole(CUSTOM_ROLE_VALUE)
        setCustomRoleTitle(savedRole)
      } else {
        setStaffCategory('')
        setSelectedRole('')
        setCustomRoleTitle('')
      }

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

    if (requiresSia && !siaNumber.trim()) {
      setError('SIA Number is required when SIA is enabled.')
      return
    }

    if (expiryDate <= issueDate) {
      setError('Expiry date must be later than issue date.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/update-staff-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          id_number: idNumber.trim(),
          role_title: roleTitle.trim(),
          site_name: null,
          sia_number: requiresSia ? siaNumber.trim() || null : null,
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
        router.push(`/staff/${record?.staff_id}`)
        router.refresh()
      }, 700)
    } catch {
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
              Update the current digital ID details for this staff member.
            </p>
          </div>

          <Link
            href={`/staff/${record.staff_id}`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Staff
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
              placeholder="ID Number"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Staff Category
            </label>
            <select
              value={staffCategory}
              onChange={(e) => {
                const value = e.target.value as StaffCategory
                setStaffCategory(value)
                setSelectedRole('')
                setCustomRoleTitle('')
                setRoleTitle('')

                if (value === 'security') {
                  setRequiresSia(true)
                } else {
                  setRequiresSia(false)
                  setSiaNumber('')
                }
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              required
            >
              <option value="">Select category</option>
              <option value="security">Security</option>
              <option value="warehouse">Warehouse</option>
              <option value="hospitality">Hospitality</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Role Title
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                const value = e.target.value
                setSelectedRole(value)

                if (value === CUSTOM_ROLE_VALUE) {
                  setRoleTitle(customRoleTitle.trim())
                } else {
                  setCustomRoleTitle('')
                  setRoleTitle(value)
                }
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              disabled={!staffCategory}
              required
            >
              <option value="">
                {staffCategory ? 'Select role' : 'Select category first'}
              </option>

              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}

              <option value={CUSTOM_ROLE_VALUE}>Other / Enter manually</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Choose a role from the dropdown, or select Other to enter your own.
            </p>
          </div>

          {selectedRole === CUSTOM_ROLE_VALUE ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Custom Role Title
              </label>
              <input
                value={customRoleTitle}
                onChange={(e) => {
                  const value = e.target.value
                  setCustomRoleTitle(value)
                  setRoleTitle(value)
                }}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Enter custom role title"
                required
              />
            </div>
          ) : null}

          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={requiresSia}
                onChange={(e) => {
                  const checked = e.target.checked
                  setRequiresSia(checked)
                  if (!checked) {
                    setSiaNumber('')
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <span className="block text-sm font-medium text-slate-800">
                  This staff member requires an SIA number
                </span>
                <span className="block text-xs text-slate-500">
                  Tick this for security staff. Leave unticked for hospitality or warehouse staff.
                </span>
              </div>
            </label>
          </div>

          {requiresSia ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                SIA Number
              </label>
              <input
                value={siaNumber}
                onChange={(e) => setSiaNumber(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Enter SIA number"
                required={requiresSia}
              />
            </div>
          ) : null}

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