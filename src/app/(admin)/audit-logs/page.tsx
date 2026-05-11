'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, X, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AuditChange = {
  field: string
  before?: any
  after?: any
}

type AuditMetadata = {
  actor_name?: string
  actor_email?: string
  actor_role?: string
  module?: string
  page?: string
  changes?: AuditChange[]
  before?: Record<string, any>
  after?: Record<string, any>
  note?: string
}

type AuditLog = {
  id: string
  action_type: string
  entity_type: string
  entity_id: string | null
  metadata: AuditMetadata | null
  created_at: string
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date))
}

function getChanges(metadata: AuditMetadata | null): AuditChange[] {
  if (!metadata) return []

  if (Array.isArray(metadata.changes)) {
    return metadata.changes
  }

  if (metadata.before && metadata.after) {
    const keys = Array.from(
      new Set([...Object.keys(metadata.before), ...Object.keys(metadata.after)])
    )

    return keys
      .filter((key) => metadata.before?.[key] !== metadata.after?.[key])
      .map((key) => ({
        field: key,
        before: metadata.before?.[key],
        after: metadata.after?.[key],
      }))
  }

  return []
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function AuditLogsPage() {
  const supabase = createClient()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)

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
      const metadata = log.metadata || {}

      return (
        log.action_type?.toLowerCase().includes(q) ||
        log.entity_type?.toLowerCase().includes(q) ||
        log.entity_id?.toLowerCase().includes(q) ||
        metadata.actor_name?.toLowerCase().includes(q) ||
        metadata.actor_email?.toLowerCase().includes(q) ||
        metadata.actor_role?.toLowerCase().includes(q) ||
        metadata.module?.toLowerCase().includes(q) ||
        metadata.page?.toLowerCase().includes(q) ||
        JSON.stringify(metadata).toLowerCase().includes(q)
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
              Full accountability trail showing who changed what, when, and where.
            </p>
          </div>

          <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-4">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, role, action, page..."
              className="w-full min-w-[260px] bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
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
          subtitle={logs.length > 0 ? formatDateTime(logs[0].created_at) : 'No activity yet'}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Activity Records
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredLogs.length} result{filteredLogs.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Changed By
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Module / Page
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Changes
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-sm text-slate-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-slate-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const metadata = log.metadata
                  const changes = getChanges(metadata)

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {metadata?.actor_name ||
                            metadata?.actor_email ||
                            'Unknown user'}
                        </p>
                        {metadata?.actor_email ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {metadata.actor_email}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {metadata?.actor_role || 'Unknown role'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                          {log.action_type}
                        </span>
                      </td>

                      

                      <td className="px-6 py-4 text-sm text-slate-700">
                        <p className="font-medium">
                          {metadata?.module || 'Unknown module'}
                        </p>
                        <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                          {metadata?.page || 'Unknown page'}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                          View
                          {changes.length > 0 ? ` (${changes.length})` : ''}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedLog ? (
        <AuditChangesModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </div>
  )
}

function AuditChangesModal({
  log,
  onClose,
}: {
  log: AuditLog
  onClose: () => void
}) {
  const metadata = log.metadata
  const changes = getChanges(metadata)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              What Changed
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {log.action_type} • {formatDateTime(log.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ModalInfo title="Changed By" value={metadata?.actor_name || metadata?.actor_email || 'Unknown user'} />
            <ModalInfo title="Role" value={metadata?.actor_role || 'Unknown role'} />
            <ModalInfo title="Module" value={metadata?.module || 'Unknown module'} />
            <ModalInfo title="Page" value={metadata?.page || 'Unknown page'} />
          </div>

          {changes.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Field
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Before
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      After
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {changes.map((change, index) => (
                    <tr
                      key={`${change.field}-${index}`}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {change.field}
                      </td>
                      <td className="max-w-[320px] break-words px-4 py-3 text-slate-600">
                        {formatValue(change.before)}
                      </td>
                      <td className="max-w-[320px] break-words px-4 py-3 text-slate-900">
                        {formatValue(change.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              {metadata?.note || 'No field-level changes recorded for this action.'}
            </div>
          )}

          {metadata?.note ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Note</p>
              <p className="mt-1 text-sm text-slate-600">{metadata.note}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ModalInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
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