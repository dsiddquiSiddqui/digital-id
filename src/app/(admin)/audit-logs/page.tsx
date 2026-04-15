'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AuditLog = {
  id: string
  action_type: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, any> | null
  created_at: string
}

export default function AuditLogsPage() {
  const supabase = createClient()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadLogs = async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setLogs(data as AuditLog[])
      }

      setLoading(false)
    }

    loadLogs()
  }, [supabase])

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs

    return logs.filter((log) => {
      return (
        log.action_type?.toLowerCase().includes(q) ||
        log.entity_type?.toLowerCase().includes(q) ||
        log.entity_id?.toLowerCase().includes(q) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(q)
      )
    })
  }, [logs, search])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Audit Logs
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Track key admin actions and important system changes.
            </p>
          </div>

          <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-4">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit logs..."
              className="w-full min-w-[240px] bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Logs" value={logs.length} />
        <SummaryCard title="Filtered Results" value={filteredLogs.length} />
        <SummaryCard
          title="Latest Activity"
          value={logs.length > 0 ? 1 : 0}
          subtitle={logs.length > 0 ? 'Logs available' : 'No activity yet'}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Activity Records</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredLogs.length} result{filteredLogs.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Entity
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Entity ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Metadata
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
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-200 last:border-b-0">
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {log.action_type}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {log.entity_type}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {log.entity_id || 'N/A'}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="max-w-[260px] truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-700">
                      {new Date(log.created_at).toLocaleString()}
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
  subtitle,
}: {
  title: string
  value: number
  subtitle?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  )
}