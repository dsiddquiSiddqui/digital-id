'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Plus, ChevronRight, Users, ShieldCheck, BadgeAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type StaffRow = {
  id: string
  full_name: string
  employee_code: string
  company_name: string | null
  email: string | null
  phone: string | null
  status: string
  staff_type: string
  photo_url: string | null
  created_at: string
}

type StaffIdRow = {
  id: string
  staff_id: string
  id_number: string
  status: string
  expiry_date: string
  is_current: boolean
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended' | 'revoked' | 'archived'
type FilterType = 'all' | 'security' | 'warehouse' | 'event' | 'admin' | 'contractor' | 'other'

export default function V2StaffPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [currentIds, setCurrentIds] = useState<Record<string, StaffIdRow | null>>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      const [staffRes, idsRes] = await Promise.all([
        supabase
          .from('staff')
          .select(`
            id,
            full_name,
            employee_code,
            company_name,
            email,
            phone,
            status,
            staff_type,
            photo_url,
            created_at
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('staff_ids')
          .select(`
            id,
            staff_id,
            id_number,
            status,
            expiry_date,
            is_current
          `)
          .eq('is_current', true),
      ])

      if (staffRes.error) {
        setError(staffRes.error.message)
        setLoading(false)
        return
      }

      if (idsRes.error) {
        setError(idsRes.error.message)
        setLoading(false)
        return
      }

      const staffData = (staffRes.data || []) as StaffRow[]
      const idsData = (idsRes.data || []) as StaffIdRow[]

      const idsMap: Record<string, StaffIdRow | null> = {}
      for (const row of idsData) {
        idsMap[row.staff_id] = row
      }

      setStaff(staffData)
      setCurrentIds(idsMap)
      setLoading(false)
    }

    loadData()
  }, [supabase])

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase()

    return staff.filter((member) => {
      const matchesSearch =
        !q ||
        member.full_name?.toLowerCase().includes(q) ||
        member.employee_code?.toLowerCase().includes(q) ||
        member.company_name?.toLowerCase().includes(q) ||
        member.email?.toLowerCase().includes(q) ||
        member.phone?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all' || member.status?.toLowerCase() === statusFilter

      const matchesType =
        typeFilter === 'all' || member.staff_type?.toLowerCase() === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [staff, search, statusFilter, typeFilter])

  const stats = useMemo(() => {
    const activeStaff = staff.filter((s) => s.status === 'active').length
    const activeIds = Object.values(currentIds).filter((id) => id?.status === 'active').length
    const missingIds = staff.filter((s) => !currentIds[s.id]).length

    return {
      total: staff.length,
      activeStaff,
      activeIds,
      missingIds,
    }
  }, [staff, currentIds])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Staff
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              New staff module built on the updated schema.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff..."
                className="min-w-[240px] bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="all">All Types</option>
              <option value="security">Security</option>
              <option value="warehouse">Warehouse</option>
              <option value="event">Event</option>
              <option value="admin">Admin</option>
              <option value="contractor">Contractor</option>
              <option value="other">Other</option>
            </select>

            <Link
              href="/v2/staff/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Staff
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Total Staff" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Active Staff" value={stats.activeStaff} icon={<ShieldCheck className="h-5 w-5" />} highlight />
        <StatCard title="Active IDs" value={stats.activeIds} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard title="Missing IDs" value={stats.missingIds} icon={<BadgeAlert className="h-5 w-5" />} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Staff Directory</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredStaff.length} result{filteredStaff.length === 1 ? '' : 's'}
          </p>
        </div>

        {error ? (
          <div className="m-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Staff</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Employee Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Company</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Staff Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Current ID</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-sm text-slate-500">
                    Loading staff...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-sm text-slate-500">
                    No staff found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const currentId = currentIds[member.id] || null

                  return (
                    <tr key={member.id} className="border-b border-slate-200 last:border-b-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                            {member.photo_url ? (
                              <Image
                                src={member.photo_url}
                                alt={member.full_name}
                                width={48}
                                height={48}
                                className="h-12 w-12 object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-slate-500">
                                {member.full_name?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            )}
                          </div>

                          <div>
                            <Link
                              href={`/v2/staff/${member.id}`}
                              className="font-semibold text-slate-900 hover:underline"
                            >
                              {member.full_name}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {member.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {member.employee_code}
                      </td>

                      <td className="px-6 py-4">
                        <TypeBadge value={member.staff_type} />
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {member.company_name || '—'}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="space-y-1">
                          <p>{member.phone || '—'}</p>
                          <p className="text-xs text-slate-500">{member.email || '—'}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={member.status} />
                      </td>

                      <td className="px-6 py-4">
                        {currentId ? (
                          <div className="space-y-1">
                            <IdBadge status={currentId.status} />
                            <p className="text-xs text-slate-500">
                              {currentId.id_number}
                            </p>
                          </div>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            No ID
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/v2/staff/${member.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string
  value: number
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm ${
        highlight ? 'bg-[#0094e0] text-white' : 'border border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        {icon}
      </div>
      <h3 className="mt-4 text-3xl font-bold">{value}</h3>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()

  if (normalized === 'active') {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Active</span>
  }

  if (normalized === 'inactive') {
    return <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">Inactive</span>
  }

  if (normalized === 'suspended') {
    return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">Suspended</span>
  }

  if (normalized === 'revoked') {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Revoked</span>
  }

  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{status}</span>
}

function TypeBadge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
      {value || 'other'}
    </span>
  )
}

function IdBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()

  if (normalized === 'active') {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">ID Active</span>
  }

  if (normalized === 'expired') {
    return <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">ID Expired</span>
  }

  if (normalized === 'revoked') {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">ID Revoked</span>
  }

  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{status}</span>
}