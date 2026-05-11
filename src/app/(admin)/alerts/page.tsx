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
}

type ScreenshotAlert = {
  id: string
  profile_id: string | null
  staff_id: string | null
  full_name: string | null
  email: string | null
  role: string | null
  page: string
  alert_type: string
  user_agent: string | null
  created_at: string
}

type AlertRow = {
  id: string
  personName: string
  personMeta: string
  eventType: string
  severity: string
  status: string
  time: string
  source: 'security' | 'screenshot'
  details: string
}

export default function AlertsPage() {
  const supabase = createClient()

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [screenshotAlerts, setScreenshotAlerts] = useState<ScreenshotAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)

      const [securityResponse, screenshotResponse] = await Promise.all([
        supabase
          .from('security_events')
          .select(`
            id,
            event_type,
            severity,
            created_at,
            reviewed_at,
            event_payload
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('screenshot_alerts')
          .select(`
            id,
            profile_id,
            staff_id,
            full_name,
            email,
            role,
            page,
            alert_type,
            user_agent,
            created_at
          `)
          .order('created_at', { ascending: false }),
      ])

      if (!securityResponse.error && securityResponse.data) {
        setSecurityEvents(securityResponse.data as SecurityEvent[])
      }

      if (!screenshotResponse.error && screenshotResponse.data) {
        setScreenshotAlerts(screenshotResponse.data as ScreenshotAlert[])
      }

      if (securityResponse.error) {
        console.error('Security events load error:', securityResponse.error)
      }

      if (screenshotResponse.error) {
        console.error('Screenshot alerts load error:', screenshotResponse.error)
      }

      setLoading(false)
    }

    loadEvents()
  }, [supabase])

  const rows: AlertRow[] = useMemo(() => {
    const securityRows: AlertRow[] = securityEvents.map((event) => {
      const payload = event.event_payload || {}

      const personName =
        payload.guard_name ||
        payload.full_name ||
        payload.staff_name ||
        payload.name ||
        'Unknown guard'

      const personMeta =
        payload.employee_code ||
        payload.guard_code ||
        payload.email ||
        '—'

      return {
        id: `security-${event.id}`,
        personName,
        personMeta,
        eventType: event.event_type || 'Security Event',
        severity: event.severity || 'medium',
        status: event.reviewed_at ? 'Reviewed' : 'Open',
        time: event.created_at,
        source: 'security',
        details: formatPayload(payload),
      }
    })

    const screenshotRows: AlertRow[] = screenshotAlerts.map((alert) => {
      return {
        id: `screenshot-${alert.id}`,
        personName: alert.full_name || 'Unknown staff',
        personMeta: alert.email || '—',
        eventType:
          alert.alert_type === 'screenshot_attempt'
            ? 'Screenshot Attempt'
            : 'Screen Hidden / App Switch',
        severity: 'critical',
        status: 'Open',
        time: alert.created_at,
        source: 'screenshot',
        details: `Page: ${alert.page || '—'} | Role: ${
          alert.role || '—'
        } | Device: ${alert.user_agent || '—'}`,
      }
    })

    return [...screenshotRows, ...securityRows].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
  }, [securityEvents, screenshotAlerts])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter((row) => {
      return (
        row.personName.toLowerCase().includes(q) ||
        row.personMeta.toLowerCase().includes(q) ||
        row.eventType.toLowerCase().includes(q) ||
        row.severity.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.source.toLowerCase().includes(q) ||
        row.details.toLowerCase().includes(q)
      )
    })
  }, [rows, search])

  const openCount = rows.filter((row) => row.status === 'Open').length
  const reviewedCount = rows.filter((row) => row.status === 'Reviewed').length
  const screenshotCount = rows.filter((row) => row.source === 'screenshot').length

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Alerts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Security events, screenshot attempts and suspicious activity across the system.
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard title="Total Alerts" value={rows.length} />
        <SummaryCard title="Open Alerts" value={openCount} />
        <SummaryCard title="Reviewed Alerts" value={reviewedCount} />
        <SummaryCard title="Screenshot Alerts" value={screenshotCount} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Alert Events</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Person
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Event
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Source
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Details
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={7}>
                    Loading alerts...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-slate-500" colSpan={7}>
                    No alerts found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-200 last:border-b-0"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div className="font-medium">{row.personName}</div>
                      <div className="text-xs text-slate-500">{row.personMeta}</div>
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {row.eventType}
                    </td>

                    <td className="px-6 py-4">
                      <SourceBadge source={row.source} />
                    </td>

                    <td className="px-6 py-4">
                      <SeverityBadge severity={row.severity} />
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge reviewed={row.status === 'Reviewed'} />
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatDateTime(row.time)}
                    </td>

                    <td className="max-w-[360px] px-6 py-4 text-xs text-slate-500">
                      <div className="line-clamp-2">{row.details}</div>
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

function formatDateTime(dateString: string) {
  if (!dateString) return '—'

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatPayload(payload: Record<string, any>) {
  const entries = Object.entries(payload || {})

  if (entries.length === 0) return '—'

  return entries
    .map(([key, value]) => {
      if (value === null || value === undefined) return `${key}: —`

      if (typeof value === 'object') {
        return `${key}: ${JSON.stringify(value)}`
      }

      return `${key}: ${String(value)}`
    })
    .join(' | ')
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

function SourceBadge({
  source,
}: {
  source: 'security' | 'screenshot'
}) {
  if (source === 'screenshot') {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        Screenshot
      </span>
    )
  }

  return (
    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
      Security
    </span>
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
      {severity || 'Low'}
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