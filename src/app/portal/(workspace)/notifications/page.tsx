'use client'

import Link from 'next/link'
import { AlertTriangle, BellRing, Check, CheckCheck, CircleDollarSign, Clock3, Search, ShieldAlert, UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePortal } from '@/components/portal/PortalProvider'
import { EmptyState, PageHeader } from '@/components/portal/PortalUi'
import { buildPortalNotifications, type PortalNotificationItem } from '@/lib/portal-notifications'

const iconByCategory = { task: Clock3, approval: ShieldAlert, support: AlertTriangle, billing: CircleDollarSign }
type View = 'all' | 'unread' | 'mine' | 'acknowledged'

export default function NotificationsPage() {
  const { tasks, approvals, tickets, organizations, notificationStates, access, refresh } = usePortal()
  const [now] = useState(() => Date.now())
  const [view, setView] = useState<View>('all')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const states = useMemo(() => new Map(notificationStates.map((item) => [item.item_key, item])), [notificationStates])
  const items = useMemo(() => buildPortalNotifications({ tasks, approvals, tickets, organizations, now }), [approvals, organizations, tasks, tickets, now])
  const visible = useMemo(() => items.filter((item) => {
    const state = states.get(item.id)
    const matchesView = view === 'all' || (view === 'unread' && !state?.read_at) || (view === 'mine' && state?.owner_profile_id === access?.id) || (view === 'acknowledged' && Boolean(state?.acknowledged_at))
    const matchesCategory = category === 'all' || item.category === category
    const term = query.trim().toLowerCase()
    return matchesView && matchesCategory && (!term || [item.title, item.detail, item.organizationName].some((value) => value.toLowerCase().includes(term)))
  }), [access?.id, category, items, query, states, view])
  const unread = items.filter((item) => !states.get(item.id)?.read_at).length
  const urgent = items.filter((item) => item.priority === 'urgent').length
  const owned = items.filter((item) => states.get(item.id)?.owner_profile_id === access?.id).length

  const update = async (itemKeys: string[], changes: { read?: boolean; acknowledged?: boolean; assign_to_me?: boolean }, success: string) => {
    if (!itemKeys.length) return
    setSaving(true); setFeedback(null)
    try {
      const response = await fetch('/api/portal/maturity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'notification_state', item_keys: itemKeys, ...changes }), keepalive: true })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update notifications.')
      setFeedback({ tone: 'success', message: success }); await refresh()
    } catch (error) { setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Unable to update notifications.' }) } finally { setSaving(false) }
  }

  return <div className="space-y-6"><PageHeader eyebrow="Action centre" title="Notifications" description="A focused work inbox for overdue tasks, approvals, breached support SLAs, and account risk." action={unread ? <button type="button" disabled={saving} onClick={() => void update(items.filter((item) => !states.get(item.id)?.read_at).map((item) => item.id), { read: true }, 'All notifications marked as read.')} className="inline-flex items-center gap-2 rounded-xl bg-[#152019] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><CheckCheck className="h-4 w-4" />Mark all read</button> : undefined} />
    {feedback ? <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${feedback.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#a9cf5b] bg-[#e9f6cc] text-[#496126]'}`}>{feedback.message}</p> : null}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Requires action" value={items.length} accent="dark" /><Summary label="Urgent" value={urgent} accent="red" /><Summary label="Unread" value={unread} accent="lime" /><Summary label="Owned by me" value={owned} accent="amber" /></section>
    <section className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_55px_rgba(20,31,24,.06)]"><div className="grid gap-3 border-b border-black/10 bg-[#fbfcfa] p-4 lg:grid-cols-[1fr_auto_auto]"><label className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 focus-within:border-[#78924e]"><Search className="h-4 w-4 text-[#718078]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notification or organization" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><div className="flex gap-2 overflow-x-auto">{(['all', 'unread', 'mine', 'acknowledged'] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black capitalize ${view === item ? 'bg-[#152019] text-white' : 'bg-[#eef1eb] text-[#59655e]'}`}>{item}</button>)}</div><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter notification category" className="h-11 rounded-xl border border-black/10 bg-white px-3 text-xs font-black"><option value="all">All categories</option><option value="task">Tasks</option><option value="approval">Approvals</option><option value="support">Support</option><option value="billing">Billing</option></select></div>
      {visible.length ? <div className="divide-y divide-black/5">{visible.map((item) => <NotificationRow key={item.id} item={item} state={states.get(item.id)} saving={saving} mine={states.get(item.id)?.owner_profile_id === access?.id} onUpdate={(changes, message) => update([item.id], changes, message)} />)}</div> : <div className="p-5"><EmptyState title="Nothing in this view" description="No notifications match the selected view, category, and search." /></div>}
      {items.length ? <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 bg-[#fbfcfa] px-4 py-3 text-xs font-bold text-[#718078]"><span>Showing {visible.length} of {items.length} active notifications</span><span>Resolved source records disappear automatically</span></footer> : null}
    </section>
  </div>
}

function NotificationRow({ item, state, saving, mine, onUpdate }: { item: PortalNotificationItem; state?: { read_at: string | null; acknowledged_at: string | null; owner_profile_id: string | null }; saving: boolean; mine: boolean; onUpdate: (changes: { read?: boolean; acknowledged?: boolean; assign_to_me?: boolean }, message: string) => Promise<void> }) {
  const Icon = iconByCategory[item.category]
  return <article className={`grid gap-4 p-4 transition sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center ${state?.read_at ? 'bg-white' : 'bg-[#fbfff3]'}`}><div className="flex min-w-0 gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.priority === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={item.href} onClick={() => void onUpdate({ read: true }, 'Notification marked as read.')} className="text-sm font-black hover:underline">{item.title}</Link>{!state?.read_at ? <span className="h-2 w-2 rounded-full bg-[#78a12d]" aria-label="Unread" /> : null}<span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${item.priority === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{item.priority}</span>{state?.acknowledged_at ? <span className="rounded-full bg-[#e9f6cc] px-2 py-1 text-[9px] font-black uppercase text-[#496126]">Acknowledged</span> : null}</div><p className="mt-1 text-xs leading-5 text-[#718078]">{item.organizationName} · {item.detail}</p><p className="mt-2 text-[10px] font-black uppercase tracking-wide text-[#9aa39d]">{item.category}</p></div></div><div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={() => void onUpdate({ read: !state?.read_at }, state?.read_at ? 'Notification marked unread.' : 'Notification marked read.')} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-black">{state?.read_at ? 'Mark unread' : 'Mark read'}</button><button type="button" disabled={saving} onClick={() => void onUpdate({ assign_to_me: !mine, read: true }, mine ? 'Notification released.' : 'Notification assigned to you.')} className="inline-flex items-center gap-1 rounded-lg bg-[#eef1eb] px-3 py-2 text-xs font-black"><UserCheck className="h-3.5 w-3.5" />{mine ? 'Release' : 'Own'}</button><button type="button" disabled={saving || Boolean(state?.acknowledged_at)} onClick={() => void onUpdate({ read: true, acknowledged: true }, 'Notification acknowledged.')} className="inline-flex items-center gap-1 rounded-lg bg-[#152019] px-3 py-2 text-xs font-black text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />Acknowledge</button></div></article>
}

function Summary({ label, value, accent }: { label: string; value: number; accent: 'dark' | 'red' | 'lime' | 'amber' }) { const colors = { dark: 'bg-[#152019] text-white', red: 'bg-red-50 text-red-700', lime: 'bg-[#e9f6cc] text-[#496126]', amber: 'bg-amber-50 text-amber-700' }; return <article className={`rounded-[22px] border border-black/10 p-5 ${colors[accent]}`}><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.14em] opacity-70">{label}</p><BellRing className="h-4 w-4 opacity-70" /></div><p className="mt-4 text-3xl font-black">{value}</p></article> }
