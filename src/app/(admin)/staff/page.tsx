'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, ChevronRight } from 'lucide-react'
import { createClient } from '../../../lib/supabase/client'

type Staff = {
  id: string
  full_name: string
  employee_code: string
  company_name: string
  status: string
  created_at: string
}

export default function StaffPage() {
  const supabase = createClient()

  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchStaff = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, employee_code, company_name, status, created_at')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setStaff(data)
      }

      setLoading(false)
    }

    fetchStaff()
  }, [supabase])

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return staff

    return staff.filter((member) => {
      return (
        member.full_name?.toLowerCase().includes(query) ||
        member.employee_code?.toLowerCase().includes(query) ||
        member.company_name?.toLowerCase().includes(query) ||
        member.status?.toLowerCase().includes(query)
      )
    })
  }, [staff, search])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Staff
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View and manage your staff records.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Staff..."
                className="w-full min-w-[220px] bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <Link
              href="/staff/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Staff
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Staff" value={staff.length} />
        <SummaryCard
          title="Active Staff"
          value={staff.filter((member) => member.status?.toLowerCase() === 'active').length}
        />
        <SummaryCard
          title="Inactive Staff"
          value={staff.filter((member) => member.status?.toLowerCase() !== 'active').length}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Staff Records</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredStaff.length} result{filteredStaff.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Employee Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                    Loading Staff...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                    No staff found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="border-b border-slate-200 last:border-b-0">
                    <td className="px-6 py-4">
                      <Link
                        href={`/staff/${member.id}`}
                        className="font-medium text-slate-900 transition hover:text-slate-700 hover:underline"
                      >
                        {member.full_name}
                      </Link>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {member.employee_code}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {member.company_name}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/staff/${member.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({
  title,
  value,
}: {
  title: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const normalized = status?.toLowerCase()

  if (normalized === 'active') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        Active
      </span>
    )
  }

  if (normalized === 'inactive') {
    return (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
        Inactive
      </span>
    )
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
      {status}
    </span>
  )
}