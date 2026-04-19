'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function generateQrToken() {
  return crypto.randomUUID()
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addOneYear(dateString: string) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  date.setFullYear(date.getFullYear() + 1)
  return formatDateInput(date)
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

type StaffRow = {
  parim_staff_id?: string | number | null
  parim_person_id?: string | number | null
}

export default function IssueIdPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const today = useMemo(() => formatDateInput(new Date()), [])
  const initialExpiry = useMemo(() => addOneYear(today), [today])

  const [staffLoading, setStaffLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [idNumber, setIdNumber] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [expiryDate, setExpiryDate] = useState(initialExpiry)
  const [expiryManuallyChanged, setExpiryManuallyChanged] = useState(false)

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
    let ignore = false

    const loadStaffData = async () => {
      setStaffLoading(true)
      setError('')

      const [{ data: staff, error: staffError }, { data: currentIds, error: currentIdError }] =
        await Promise.all([
          supabase
            .from('staff')
            .select('parim_staff_id, parim_person_id')
            .eq('id', id)
            .single(),
          supabase
            .from('staff_ids')
            .select('role_title, sia_number')
            .eq('staff_id', id)
            .eq('is_current', true)
            .order('created_at', { ascending: false })
            .limit(1),
        ])

      if (ignore) return

      if (staffError) {
        setError(staffError.message)
        setStaffLoading(false)
        return
      }

      if (currentIdError) {
        setError(currentIdError.message)
        setStaffLoading(false)
        return
      }

      const staffRow = (staff as StaffRow | null) ?? null
      const currentId = currentIds?.[0] ?? null

      const parimId =
        staffRow?.parim_staff_id ??
        staffRow?.parim_person_id ??
        ''

      const existingRoleTitle = currentId?.role_title ?? ''
      const existingSia = currentId?.sia_number ?? ''

      setIdNumber(parimId ? String(parimId) : '')

      const role = String(existingRoleTitle || '')
      setRoleTitle(role)

      if (ROLE_OPTIONS.security.includes(role as (typeof ROLE_OPTIONS.security)[number])) {
        setStaffCategory('security')
        setSelectedRole(role)
      } else if (ROLE_OPTIONS.warehouse.includes(role as (typeof ROLE_OPTIONS.warehouse)[number])) {
        setStaffCategory('warehouse')
        setSelectedRole(role)
      } else if (
        ROLE_OPTIONS.hospitality.includes(role as (typeof ROLE_OPTIONS.hospitality)[number])
      ) {
        setStaffCategory('hospitality')
        setSelectedRole(role)
      } else if (role) {
        setSelectedRole(CUSTOM_ROLE_VALUE)
        setCustomRoleTitle(role)
      }

      if (existingSia) {
        setRequiresSia(true)
        setSiaNumber(String(existingSia))
      } else {
        setSiaNumber('')
      }

      setStaffLoading(false)
    }

    loadStaffData()

    return () => {
      ignore = true
    }
  }, [id, supabase])

  useEffect(() => {
    if (!expiryManuallyChanged) {
      setExpiryDate(addOneYear(issueDate))
    }
  }, [issueDate, expiryManuallyChanged])

  const handleIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!idNumber.trim()) {
      setError('ID Number is required.')
      setLoading(false)
      return
    }

    if (!roleTitle.trim()) {
      setError('Role Title is required.')
      setLoading(false)
      return
    }

    if (requiresSia && !siaNumber.trim()) {
      setError('SIA Number is required when SIA is enabled.')
      setLoading(false)
      return
    }

    if (!issueDate || !expiryDate) {
      setError('Issue date and expiry date are required.')
      setLoading(false)
      return
    }

    if (expiryDate <= issueDate) {
      setError('Expiry date must be later than issue date.')
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      setError(profileError?.message || 'Admin profile not found.')
      setLoading(false)
      return
    }

    const { error: updateOldIdsError } = await supabase
      .from('staff_ids')
      .update({ is_current: false, status: 'revoked' })
      .eq('staff_id', id)
      .eq('is_current', true)

    if (updateOldIdsError) {
      setError(updateOldIdsError.message)
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('staff_ids').insert([
      {
        staff_id: id,
        id_number: idNumber.trim(),
        issue_date: issueDate,
        expiry_date: expiryDate,
        site_name: null,
        role_title: roleTitle.trim(),
        sia_number: requiresSia ? siaNumber.trim() : null,
        qr_token: generateQrToken(),
        watermark_text: 'Internal Digital ID',
        is_current: true,
        status: 'active',
        created_by: profile.id,
      },
    ])

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push(`/v2/staff/${id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Issue Digital ID
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a new digital ID for this staff member. Previous IDs will automatically be marked as non-current.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleIssue} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ID Number
            </label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Auto-filled from Parim ID"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Auto-filled from staff parim ID, but you can still edit it.
            </p>
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
              onChange={(e) => {
                setIssueDate(e.target.value)
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Expiry date auto-fills to one year after the issue date.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => {
                setExpiryDate(e.target.value)
                setExpiryManuallyChanged(true)
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              required
            />
            <button
              type="button"
              onClick={() => {
                setExpiryDate(addOneYear(issueDate))
                setExpiryManuallyChanged(false)
              }}
              className="mt-2 text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
            >
              Reset to +1 year
            </button>
          </div>

          {staffLoading ? (
            <div className="lg:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading staff details...
            </div>
          ) : null}

          {error ? (
            <div className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading || staffLoading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Issuing ID...' : 'Issue Digital ID'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}