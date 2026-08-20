'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Activity, FileText, Search, ShieldCheck, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AuditMetadata = {
  actor_name?: string
  actor_email?: string
  module?: string
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function activityIcon(entityType: string) {
  const type = entityType.toLowerCase()
  if (type.includes('document')) return FileText
  if (type.includes('id')) return ShieldCheck
  if (type.includes('staff')) return UserRound
  return Activity
}

export default function StaffActivityPage() {
  const params = useParams<{ id: string }>()
  const staffId = params.id
  const supabase = useMemo(() => createClient(), [])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Your session could not be verified.')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('auth_user_id', user.id).single()
      if (!profile?.organization_id) {
        setError('Your workspace could not be loaded.')
        setLoading(false)
        return
      }

      const auditColumns = 'id, action_type, entity_type, entity_id, metadata, created_at'
      const [directEvents, relatedEvents] = await Promise.all([
        supabase
          .from('audit_logs')
          .select(auditColumns)
          .eq('organization_id', profile.organization_id)
          .eq('entity_id', staffId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('audit_logs')
          .select(auditColumns)
          .eq('organization_id', profile.organization_id)
          .contains('metadata', { staff_id: staffId })
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (directEvents.error || relatedEvents.error) {
        setError('Activity is unavailable for your current role.')
      } else {
        const eventsById = new Map<string, AuditLog>()
        const allEvents = [
          ...((directEvents.data || []) as AuditLog[]),
          ...((relatedEvents.data || []) as AuditLog[]),
        ]

        allEvents.forEach((event) => eventsById.set(event.id, event))
        setLogs(
          Array.from(eventsById.values())
            .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at))
            .slice(0, 100)
        )
      }
      setLoading(false)
    }
    void load()
  }, [staffId, supabase])

  const visibleLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return logs
    return logs.filter((log) => `${log.action_type} ${log.entity_type} ${log.metadata?.actor_name || ''} ${log.metadata?.actor_email || ''} ${log.metadata?.note || ''}`.toLowerCase().includes(normalized))
  }, [logs, query])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dx-eyebrow">Audit trail</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--dx-ink)]">Activity</h2>
          <p className="mt-2 text-sm text-[var(--dx-muted)]">A chronological record of profile, document and credential changes.</p>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--dx-line)] bg-white px-3 sm:w-72">
          <Search className="h-4 w-4 text-[var(--dx-muted)]" /><span className="sr-only">Search activity</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      </header>

      <section className="dx-surface overflow-hidden">
        {loading ? <div className="p-6 text-sm text-[var(--dx-muted)]">Loading activity…</div> : null}
        {error ? <div className="m-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{error}</div> : null}
        {!loading && !error && visibleLogs.length === 0 ? <div className="px-6 py-14 text-center"><Activity className="mx-auto h-6 w-6 text-[var(--dx-muted)]" /><p className="mt-3 text-sm font-semibold text-[var(--dx-muted-strong)]">No matching activity yet</p></div> : null}
        {!loading && !error ? <div className="divide-y divide-[var(--dx-line)]">{visibleLogs.map((log) => {
          const Icon = activityIcon(log.entity_type)
          return <article key={log.id} className="flex gap-4 px-5 py-4 hover:bg-[var(--dx-surface-muted)]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dx-signal-soft)] text-[var(--dx-signal)]"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-[var(--dx-ink)]">{log.action_type.replace(/_/g, ' ')}</p><time className="text-xs text-[var(--dx-muted)]">{formatDateTime(log.created_at)}</time></div><p className="mt-1 text-xs leading-5 text-[var(--dx-muted)]">{log.metadata?.note || `${log.entity_type.replace(/_/g, ' ')} updated`} · {log.metadata?.actor_name || log.metadata?.actor_email || 'System'}</p></div></article>
        })}</div> : null}
      </section>
    </div>
  )
}
