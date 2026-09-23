'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Info,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-react'
import { useToast } from '@/components/admin/ToastProvider'

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  severity: 'info' | 'success' | 'warning' | 'critical'
  action_url: string | null
  read_at: string | null
  created_at: string
}

type Filter = 'all' | 'unread' | 'critical' | 'warning'

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'unread', label: 'Unread' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warnings' },
]

const severityStyles = {
  info: {
    icon: Info,
    label: 'Information',
    iconClass: 'bg-[#eef2f3] text-[#50616a]',
    badgeClass: 'bg-[#eef2f3] text-[#50616a]',
    railClass: 'bg-[#8a9aa2]',
  },
  success: {
    icon: CheckCircle2,
    label: 'Completed',
    iconClass: 'bg-[var(--dx-signal-soft)] text-[var(--dx-success)]',
    badgeClass: 'bg-[var(--dx-signal-soft)] text-[var(--dx-success)]',
    railClass: 'bg-[var(--dx-success)]',
  },
  warning: {
    icon: TriangleAlert,
    label: 'Warning',
    iconClass: 'bg-[#fff4df] text-[var(--dx-warning)]',
    badgeClass: 'bg-[#fff4df] text-[var(--dx-warning)]',
    railClass: 'bg-[#d28a17]',
  },
  critical: {
    icon: CircleAlert,
    label: 'Critical',
    iconClass: 'bg-[#fff0ee] text-[var(--dx-danger)]',
    badgeClass: 'bg-[#fff0ee] text-[var(--dx-danger)]',
    railClass: 'bg-[var(--dx-danger)]',
  },
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
})

function dateGroup(value: string) {
  const date = new Date(value)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((today.getTime() - target.getTime()) / 86_400_000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'Earlier this week'
  return 'Earlier'
}

function readableType(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function NotificationsPage() {
  const { notify } = useToast()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/notifications', { cache: 'no-store' })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error || 'Unable to load notifications.')
        return
      }
      setNotifications(result?.notifications || [])
    } catch {
      setError('Unable to load notifications. Check your connection and try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markRead = async (id: string) => {
    setUpdating(id)
    const previous = notifications
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    )
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Unable to mark the notification as read.')
      window.dispatchEvent(new Event('notifications:changed'))
    } catch (reason) {
      setNotifications(previous)
      notify({
        tone: 'error',
        title: 'Notification not updated',
        body: reason instanceof Error ? reason.message : 'Try again.',
      })
    } finally {
      setUpdating(null)
    }
  }

  const markAllRead = async () => {
    setUpdating('all')
    const previous = notifications
    const now = new Date().toISOString()
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || now })))
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Unable to mark all notifications as read.')
      window.dispatchEvent(new Event('notifications:changed'))
      notify({
        tone: 'success',
        title: 'Notifications cleared',
        body: 'Everything is marked as read.',
      })
    } catch (reason) {
      setNotifications(previous)
      notify({
        tone: 'error',
        title: 'Notifications not updated',
        body: reason instanceof Error ? reason.message : 'Try again.',
      })
    } finally {
      setUpdating(null)
    }
  }

  const refresh = () => {
    setRefreshing(true)
    void load()
  }

  const unread = notifications.filter((item) => !item.read_at).length
  const priority = notifications.filter(
    (item) => !item.read_at && (item.severity === 'critical' || item.severity === 'warning')
  ).length
  const today = notifications.filter((item) => dateGroup(item.created_at) === 'Today').length

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return notifications.filter((item) => {
      if (filter === 'unread' && item.read_at) return false
      if ((filter === 'critical' || filter === 'warning') && item.severity !== filter) return false
      if (!normalizedQuery) return true

      return [item.title, item.body, item.type]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery))
    })
  }, [filter, notifications, query])

  const grouped = useMemo(
    () =>
      filtered.reduce<Record<string, NotificationRow[]>>((groups, item) => {
        const key = dateGroup(item.created_at)
        groups[key] = groups[key] || []
        groups[key].push(item)
        return groups
      }, {}),
    [filtered]
  )

  if (loading) return <NotificationSkeleton />

  if (error) {
    return (
      <main className="dx-page">
        <section className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-red-200 bg-white px-6 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff0ee] text-[var(--dx-danger)]">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-lg font-bold text-[var(--dx-ink)]">Notifications are unavailable</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--dx-muted)]">{error}</p>
          <button type="button" onClick={() => void load(true)} className="dx-button dx-button-primary mt-6">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="dx-page space-y-5">
      <header className="flex flex-col gap-5 border-b border-[var(--dx-line)] pb-6 pt-1 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="dx-eyebrow">Workspace activity</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111612] text-[#7ee2a8]">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="font-[var(--dx-font-display)] text-3xl font-bold tracking-[-0.04em] text-[var(--dx-ink)] sm:text-4xl">
              Notifications
            </h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--dx-muted)]">
            A live record of document, security, billing, and workspace updates that need your attention.
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            disabled={updating === 'all'}
            onClick={markAllRead}
            className="dx-button dx-button-primary self-start md:self-auto"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            {updating === 'all' ? 'Updating…' : 'Mark all as read'}
          </button>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-[var(--dx-line)] bg-white px-4 text-sm font-bold text-[var(--dx-success)] md:self-auto">
            <Check className="h-4 w-4" aria-hidden="true" />
            You’re all caught up
          </span>
        )}
      </header>

      <section className="grid overflow-hidden rounded-xl border border-[var(--dx-line)] bg-[#111612] text-white shadow-sm sm:grid-cols-3">
        <SummaryMetric label="Unread" value={unread} detail="Waiting for review" />
        <SummaryMetric label="Priority" value={priority} detail="Critical or warning" />
        <SummaryMetric label="Today" value={today} detail="New workspace activity" />
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--dx-line)] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--dx-line)] bg-[#fafbfa] p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1" aria-label="Notification filters">
            {FILTERS.map((item) => {
              const count = item.value === 'unread'
                ? unread
                : item.value === 'critical' || item.value === 'warning'
                  ? notifications.filter((notification) => notification.severity === item.value).length
                  : notifications.length

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={filter === item.value}
                  className={`min-h-10 rounded-lg px-3.5 text-xs font-bold transition ${
                    filter === item.value
                      ? 'bg-[#111612] text-white shadow-sm'
                      : 'text-[var(--dx-muted-strong)] hover:bg-[var(--dx-surface-muted)]'
                  }`}
                >
                  {item.label}
                  <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] ${
                    filter === item.value ? 'bg-white/12 text-white/75' : 'bg-[#e9ecea] text-[var(--dx-muted)]'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <span className="sr-only">Search notifications</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dx-muted)]" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notifications"
                className="min-h-10 w-full rounded-lg border border-[var(--dx-line)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--dx-ink)] placeholder:text-[var(--dx-muted)]"
              />
            </label>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dx-line)] bg-white text-[var(--dx-muted-strong)] transition hover:bg-[var(--dx-surface-muted)] disabled:cursor-wait disabled:opacity-60"
              aria-label="Refresh notifications"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasNotifications={notifications.length > 0} clearFilters={() => {
            setFilter('all')
            setQuery('')
          }} />
        ) : (
          <div>
            {Object.entries(grouped).map(([group, items]) => (
              <section key={group} aria-labelledby={`notification-group-${group.replace(/\s/g, '-').toLowerCase()}`}>
                <div className="flex items-center justify-between border-b border-[var(--dx-line)] bg-white px-4 py-3 sm:px-6">
                  <h2 id={`notification-group-${group.replace(/\s/g, '-').toLowerCase()}`} className="text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--dx-muted)]">
                    {group}
                  </h2>
                  <span className="text-xs font-semibold text-[var(--dx-muted)]">{items.length} update{items.length === 1 ? '' : 's'}</span>
                </div>
                <div className="divide-y divide-[var(--dx-line)]">
                  {items.map((item) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      updating={updating === item.id}
                      markRead={markRead}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function SummaryMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="relative px-5 py-5 sm:px-6 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/10 sm:[&:not(:last-child)]:border-b-0 sm:[&:not(:last-child)]:border-r">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{label}</p>
      <div className="mt-2 flex items-end gap-3">
        <p className="text-3xl font-bold tracking-[-0.05em]">{value.toLocaleString()}</p>
        <p className="pb-1 text-xs font-medium text-white/50">{detail}</p>
      </div>
    </div>
  )
}

function NotificationItem({
  item,
  updating,
  markRead,
}: {
  item: NotificationRow
  updating: boolean
  markRead: (id: string) => Promise<void>
}) {
  const style = severityStyles[item.severity] || severityStyles.info
  const Icon = style.icon

  return (
    <article className={`group relative grid grid-cols-[3rem_minmax(0,1fr)] gap-3 px-4 py-5 transition sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-6 ${
      item.read_at ? 'bg-white hover:bg-[#fbfcfb]' : 'bg-[#f8fbf9] hover:bg-[#f3f8f5]'
    }`}>
      {!item.read_at ? <span className="absolute inset-y-0 left-0 w-0.5 bg-[#38b66a]" aria-label="Unread" /> : null}
      <div className="relative flex justify-center">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconClass}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className={`absolute -bottom-5 left-1/2 hidden h-5 w-px -translate-x-1/2 opacity-20 sm:block ${style.railClass}`} aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-sm leading-5 text-[var(--dx-ink)] ${item.read_at ? 'font-semibold' : 'font-bold'}`}>
            {item.title}
          </h3>
          {!item.read_at ? <span className="h-1.5 w-1.5 rounded-full bg-[#17834b]" aria-hidden="true" /> : null}
        </div>
        {item.body ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--dx-muted)]">{item.body}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${style.badgeClass}`}>
            {style.label}
          </span>
          <span className="text-xs font-semibold text-[var(--dx-muted-strong)]">{readableType(item.type)}</span>
          <span className="hidden h-1 w-1 rounded-full bg-[var(--dx-line-strong)] sm:block" aria-hidden="true" />
          <time dateTime={item.created_at} className="inline-flex items-center gap-1.5 text-xs text-[var(--dx-muted)]">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {dateFormatter.format(new Date(item.created_at))} at {timeFormatter.format(new Date(item.created_at))}
          </time>
        </div>
      </div>

      <div className="col-start-2 flex items-center gap-2 sm:col-start-3 sm:row-start-1 sm:self-center">
        {item.action_url ? (
          <Link
            href={item.action_url}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#111612] px-3.5 text-xs font-bold text-white transition hover:bg-[#202821]"
          >
            View
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
        {!item.read_at ? (
          <button
            type="button"
            disabled={updating}
            onClick={() => void markRead(item.id)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--dx-line)] bg-white px-3.5 text-xs font-bold text-[var(--dx-muted-strong)] transition hover:border-[var(--dx-line-strong)] hover:bg-[var(--dx-surface-muted)] disabled:cursor-wait disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {updating ? 'Updating…' : 'Mark read'}
          </button>
        ) : null}
      </div>
    </article>
  )
}

function EmptyState({
  hasNotifications,
  clearFilters,
}: {
  hasNotifications: boolean
  clearFilters: () => void
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--dx-signal-soft)] text-[var(--dx-success)]">
        <CheckCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-base font-bold text-[var(--dx-ink)]">
        {hasNotifications ? 'No matching notifications' : 'No notifications yet'}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--dx-muted)]">
        {hasNotifications
          ? 'Try another filter or clear your search to see more workspace activity.'
          : 'Document, security, billing, and workspace updates will appear here.'}
      </p>
      {hasNotifications ? (
        <button type="button" onClick={clearFilters} className="dx-button dx-button-secondary mt-5">
          Clear filters
        </button>
      ) : null}
    </div>
  )
}

function NotificationSkeleton() {
  return (
    <main className="dx-page animate-pulse space-y-5" aria-label="Loading notifications">
      <div className="border-b border-[var(--dx-line)] pb-6">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="mt-4 h-10 w-64 rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-100" />
      </div>
      <div className="h-28 rounded-xl bg-[#111612]" />
      <div className="overflow-hidden rounded-xl border border-[var(--dx-line)] bg-white">
        <div className="h-16 border-b border-[var(--dx-line)] bg-slate-50" />
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex gap-4 border-b border-[var(--dx-line)] p-6 last:border-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
            <div className="flex-1">
              <div className="h-4 w-2/5 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-4/5 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-3/5 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
