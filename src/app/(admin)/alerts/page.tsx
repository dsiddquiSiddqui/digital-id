'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SecurityEvent = {
  id: string
  event_type: string
  severity: string
  created_at: string
  reviewed_at: string | null
  event_payload: Record<string, any> | null
  guards:
    | {
        full_name: string
        employee_code: string
      }[]
    | null
}

export default function AlertsPage() {
  const supabase = createClient()

  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error } = await supabase
        .from('security_events')
        .select(`
          id,
          event_type,
          severity,
          created_at,
          reviewed_at,
          event_payload,
          guards (
            full_name,
            employee_code
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setEvents(data as SecurityEvent[])
      }

      setLoading(false)
    }

    loadEvents()
  }, [supabase])

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return events

    return events.filter((event) => {
      const guardName = event.guards?.[0]?.full_name?.toLowerCase() || ''
      const employeeCode = event.guards?.[0]?.employee_code?.toLowerCase() || ''

      return (
        event.event_type?.toLowerCase().includes(q) ||
        event.severity?.toLowerCase().includes(q) ||
        guardName.includes(q) ||
        employeeCode.includes(q) ||
        JSON.stringify(event.event_payload || {}).toLowerCase().includes(q)
      )
    })
  }, [events, search])

  const openCount = events.filter((e) => !e.reviewed_at).length
  const reviewedCount = events.filter((e) => !!e.reviewed_at).length

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Alerts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Security events and suspicious activity across the system.
            </p>
          </div>

          <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-4">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts..."
              className="w-full min-w-[240px] bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Alerts" value={events.length} />
        <SummaryCard title="Open Alerts" value={openCount} />
        <SummaryCard title="Reviewed Alerts" value={reviewedCount} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Security Events</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredEvents.length} result{filteredEvents.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Guard
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Event
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Severity
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Time
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                    Loading alerts...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                    No alerts found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const guard = event.guards?.[0]

                  return (
                    <tr key={event.id} className="border-b border-slate-200 last:border-b-0">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {guard
                          ? `${guard.full_name} (${guard.employee_code})`
                          : 'Unknown guard'}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {event.event_type}
                      </td>

                      <td className="px-6 py-4">
                        <SeverityBadge severity={event.severity} />
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge reviewed={!!event.reviewed_at} />
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(event.created_at).toLocaleString()}
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

function SeverityBadge({
  severity,
}: {
  severity: string
}) {
  const normalized = severity?.toLowerCase()

  if (normalized === 'critical') {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        Critical
      </span>
    )
  }

  if (normalized === 'high') {
    return (
      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
        High
      </span>
    )
  }

  if (normalized === 'medium') {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
        Medium
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {severity}
    </span>
  )
}

function StatusBadge({
  reviewed,
}: {
  reviewed: boolean
}) {
  return reviewed ? (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
      Reviewed
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
      Open
    </span>
  )
}