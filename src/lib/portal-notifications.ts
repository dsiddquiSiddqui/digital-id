import type { OrganizationRow, PortalApproval, PortalTask, SupportTicket } from '@/components/portal/types'

export type PortalNotificationItem = {
  id: string
  category: 'task' | 'approval' | 'support' | 'billing'
  title: string
  detail: string
  priority: 'urgent' | 'high'
  href: string
  occurredAt: string
  organizationName: string
}

export function buildPortalNotifications(input: { tasks: PortalTask[]; approvals: PortalApproval[]; tickets: SupportTicket[]; organizations: OrganizationRow[]; now?: number }) {
  const now = input.now ?? Date.now()
  const items: PortalNotificationItem[] = [
    ...input.tasks.filter((task) => !['completed', 'cancelled'].includes(task.status) && task.due_at && new Date(task.due_at).getTime() < now).map((task) => ({ id: `task-${task.id}`, category: 'task' as const, title: `Overdue: ${task.title}`, detail: `Due ${format(task.due_at!)}`, priority: 'urgent' as const, href: '/portal/tasks', occurredAt: task.due_at!, organizationName: task.organization?.name || 'Unknown organization' })),
    ...input.approvals.filter((approval) => approval.status === 'pending').map((approval) => ({ id: `approval-${approval.id}`, category: 'approval' as const, title: `Approval required: ${approval.action_type.replaceAll('_', ' ')}`, detail: `Requested ${format(approval.created_at)}`, priority: 'high' as const, href: '/portal/tasks', occurredAt: approval.created_at, organizationName: approval.organization?.name || 'Platform-wide' })),
    ...input.tickets.filter((ticket) => !ticket.first_response_at && ticket.first_response_due_at && new Date(ticket.first_response_due_at).getTime() < now && !['resolved', 'closed'].includes(ticket.status)).map((ticket) => ({ id: `ticket-${ticket.id}`, category: 'support' as const, title: `SLA breached: ${ticket.subject}`, detail: `Case #${ticket.ticket_number} needs a first response`, priority: 'urgent' as const, href: `/portal/support?ticket=${ticket.id}`, occurredAt: ticket.first_response_due_at!, organizationName: ticket.organization?.name || 'Unknown organization' })),
    ...input.organizations.filter((organization) => ['cancelled', 'canceled', 'past_due', 'unpaid', 'incomplete_expired'].includes(organization.subscription_status || '')).map((organization) => ({ id: `billing-${organization.id}`, category: 'billing' as const, title: `Billing intervention: ${organization.name}`, detail: `${organization.plan_name} · ${(organization.subscription_status || 'attention').replaceAll('_', ' ')}`, priority: 'high' as const, href: `/portal/organizations/${organization.id}`, occurredAt: organization.subscription_period_end || organization.created_at, organizationName: organization.name })),
  ]
  return items.sort((a, b) => (a.priority === b.priority ? new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime() : a.priority === 'urgent' ? -1 : 1))
}

function format(value: string) { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
