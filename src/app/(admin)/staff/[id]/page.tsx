'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import IdCard from '@/components/IdCard'

type Staff = {
  id: string
  full_name: string
  employee_code: string
  company_name: string
  phone: string | null
  email: string | null
  status: string
  photo_url?: string | null
}

type StaffId = {
  id: string
  id_number: string
  role_title: string
  site_name: string | null
  sia_number: string | null
  issue_date: string
  expiry_date: string
  is_current: boolean
  status: string
  qr_token: string
}

export default function StaffDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const id = params.id as string

  const [staff, setStaff] = useState<Staff | null>(null)
  const [staffIds, setStaffIds] = useState<StaffId[]>([])
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchData = async () => {
    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()

    const { data: idData } = await supabase
      .from('staff_ids')
      .select('*')
      .eq('staff_id', id)
      .order('created_at', { ascending: false })

    if (staffData) setStaff(staffData)
    if (idData) setStaffIds(idData)
    setLoading(false)
  }

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  const updateStatus = async (newStatus: string) => {
    if (!staff) return

    setStatusLoading(newStatus)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/update-staff-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.id,
          status: newStatus,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update status.')
        setStatusLoading(null)
        return
      }

      setStaff((prev) => (prev ? { ...prev, status: newStatus } : prev))
      setMessage(`Staff status updated to ${newStatus}.`)
    } catch (err) {
      setError('Something went wrong while updating status.')
    } finally {
      setStatusLoading(null)
    }
  }

  const currentId = useMemo(
    () => staffIds.find((item) => item.is_current) || null,
    [staffIds]
  )

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-slate-600">Loading staff member...</p>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <p className="text-sm text-slate-600">Staff member not found.</p>
      </div>
    )
  }

  function IdStatusBadge({
    status,
  }: {
    status: string
  }) {
    const normalized = status?.toLowerCase()

    if (normalized === 'active') {
      return (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          ID Active
        </span>
      )
    }

    if (normalized === 'suspended') {
      return (
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
          ID Suspended
        </span>
      )
    }

    if (normalized === 'revoked') {
      return (
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
          ID Revoked
        </span>
      )
    }

    if (normalized === 'expired') {
      return (
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
          ID Expired
        </span>
      )
    }

    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
        {status || 'Unknown'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
              {staff.photo_url ? (
                <img
                  src={staff.photo_url}
                  alt={staff.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-slate-500">
                  {staff.full_name.charAt(0)}
                </span>
              )}
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {staff.full_name}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Employee Code: {staff.employee_code}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Company: {staff.company_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/staff/${staff.id}/password`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Password
            </Link>

            <Link
              href={`/staff/${staff.id}/edit`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit Staff
            </Link>

            {currentId ? (
              <Link
                href={`/staff-ids/${currentId.id}/edit`}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Edit Digital ID
              </Link>
            ) : (
              <Link
                href={`/staff/${staff.id}/issue-id`}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Issue Digital ID
              </Link>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Staff Details</h3>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoBox label="Full Name" value={staff.full_name} />
              <InfoBox label="Employee Code" value={staff.employee_code} />
              <InfoBox label="Company" value={staff.company_name} />
              <InfoBox label="Phone" value={staff.phone || '—'} />
              <InfoBox label="Email" value={staff.email || '—'} />
              <InfoBox label="Status" value={staff.status} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Issued IDs</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Current and historical digital IDs for this staff member
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {staffIds.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  No digital IDs issued yet.
                </div>
              ) : (
                staffIds.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      {item.is_current ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                          Current
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Previous
                        </span>
                      )}

                      <IdStatusBadge status={item.status} />

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {item.role_title}
                      </span>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <InfoBox label="ID Number" value={item.id_number} />
                      <InfoBox label="Site Name" value={item.site_name || '—'} />
                      <InfoBox label="SIA Number" value={item.sia_number || '—'} />
                      <InfoBox label="Issue Date" value={item.issue_date} />
                      <InfoBox label="Expiry Date" value={item.expiry_date} />
                    </div>

                    <IdCard
                      fullName={staff.full_name}
                      employeeCode={staff.employee_code}
                      roleTitle={item.role_title}
                      idNumber={item.id_number}
                      qrToken={item.qr_token}
                      photoUrl={staff.photo_url}
                      issueDate={item.issue_date}
                      expiryDate={item.expiry_date}
                      idStatus={item.status}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Status Actions</h3>

            <div className="mt-4 space-y-3">
              <button
                onClick={() => updateStatus('active')}
                disabled={statusLoading !== null}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {statusLoading === 'active' ? 'Updating...' : 'Activate'}
              </button>

              <button
                onClick={() => updateStatus('suspended')}
                disabled={statusLoading !== null}
                className="w-full rounded-2xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {statusLoading === 'suspended' ? 'Updating...' : 'Suspend'}
              </button>

              <button
                onClick={() => updateStatus('revoked')}
                disabled={statusLoading !== null}
                className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {statusLoading === 'revoked' ? 'Updating...' : 'Revoke'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Current ID Summary</h3>

            <div className="mt-4 space-y-4">
              <InfoBox label="Current ID" value={currentId?.id_number || 'No current ID'} />
              <InfoBox label="Role Title" value={currentId?.role_title || '—'} />
              <InfoBox label="ID Status" value={currentId?.status || '—'} />
              <InfoBox label="Expiry Date" value={currentId?.expiry_date || '—'} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}