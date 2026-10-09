'use client'

import Link from 'next/link'
import { AlertTriangle, BellRing, CheckCircle2, CircleDollarSign, Clock3, ShieldAlert } from 'lucide-react'
import { usePortal } from '@/components/portal/PortalProvider'
import { EmptyState, PageHeader, StatusPill, formatDateTime } from '@/components/portal/PortalUi'

export default function NotificationsPage() {
  const { tasks, approvals, tickets, organizations } = usePortal()
  const now = Date.now()
  const items = [
    ...tasks.filter((task) => !['completed', 'cancelled'].includes(task.status) && task.due_at && new Date(task.due_at).getTime() < now).map((task) => ({ id: `task-${task.id}`, icon: Clock3, title: `Overdue: ${task.title}`, detail: `${task.organization?.name} · due ${formatDateTime(task.due_at)}`, tone: 'urgent', href: '/portal/tasks' })),
    ...approvals.filter((approval) => approval.status === 'pending').map((approval) => ({ id: `approval-${approval.id}`, icon: ShieldAlert, title: `Approval required: ${approval.action_type.replaceAll('_', ' ')}`, detail: `${approval.organization?.name || 'Platform-wide'} · requested ${formatDateTime(approval.created_at)}`, tone: 'high', href: '/portal/tasks' })),
    ...tickets.filter((ticket) => !ticket.first_response_at && ticket.first_response_due_at && new Date(ticket.first_response_due_at).getTime() < now).map((ticket) => ({ id: `ticket-${ticket.id}`, icon: AlertTriangle, title: `Support SLA breached: ${ticket.subject}`, detail: `${ticket.organization?.name} · case #${ticket.ticket_number}`, tone: 'urgent', href: `/portal/support?ticket=${ticket.id}` })),
    ...organizations.filter((organization) => ['cancelled', 'past_due', 'unpaid'].includes(organization.subscription_status || '')).map((organization) => ({ id: `billing-${organization.id}`, icon: CircleDollarSign, title: `Billing intervention: ${organization.name}`, detail: `${organization.plan_name} · ${organization.subscription_status}`, tone: 'high', href: `/portal/organizations/${organization.id}` })),
  ]
  return <div className="space-y-6"><PageHeader eyebrow="Action centre" title="Notifications" description="A live, prioritized inbox generated from overdue work, SLA breaches, approvals, and commercial risk." />
    <section className="grid gap-3 sm:grid-cols-3"><Summary icon={<BellRing />} label="Requires action" value={items.length} /><Summary icon={<AlertTriangle />} label="Urgent" value={items.filter((item) => item.tone === 'urgent').length} /><Summary icon={<CheckCircle2 />} label="Healthy signal" value={items.length === 0 ? 1 : 0} /></section>
    <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_18px_55px_rgba(20,31,24,0.06)] sm:p-6">{items.length ? <div className="divide-y divide-black/5">{items.map((item) => { const Icon = item.icon; return <Link key={item.id} href={item.href} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.tone === 'urgent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.title}</p><p className="mt-1 truncate text-xs text-[#718078]">{item.detail}</p></div><StatusPill value={item.tone} /></Link> })}</div> : <EmptyState title="Everything is under control" description="There are no breached deadlines, pending approvals, or critical commercial alerts." />}</section>
  </div>
}
function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <article className="rounded-[22px] border border-black/10 bg-white p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#718078]">{label}</p><span className="[&>svg]:h-4 [&>svg]:w-4 text-[#78924e]">{icon}</span></div><p className="mt-4 text-3xl font-black">{value}</p></article> }
