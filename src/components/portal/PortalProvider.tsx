'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationRow, PortalAccess, PortalApproval, PortalAuditEvent, PortalMetrics, PortalTask, PortalUser, SupportAgent, SupportTicket } from './types'

type PortalContextValue = { organizations: OrganizationRow[]; users: PortalUser[]; tickets: SupportTicket[]; agents: SupportAgent[]; auditEvents: PortalAuditEvent[]; tasks: PortalTask[]; approvals: PortalApproval[]; access: PortalAccess | null; metrics: PortalMetrics; loading: boolean; error: string; canManageSupport: boolean; lastUpdated: Date | null; refresh: () => Promise<void> }
const emptyMetrics: PortalMetrics = { organizations: 0, activeOrganizations: 0, suspendedOrganizations: 0, cancelledSubscriptions: 0, monthlyRevenue: 0, annualRevenue: 0, users: 0, staff: 0 }
const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [users, setUsers] = useState<PortalUser[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [auditEvents, setAuditEvents] = useState<PortalAuditEvent[]>([])
  const [tasks, setTasks] = useState<PortalTask[]>([])
  const [approvals, setApprovals] = useState<PortalApproval[]>([])
  const [access, setAccess] = useState<PortalAccess | null>(null)
  const [metrics, setMetrics] = useState<PortalMetrics>(emptyMetrics)
  const [canManageSupport, setCanManageSupport] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [summaryResponse, supportResponse, operationsResponse] = await Promise.all([fetch('/api/portal/summary', { cache: 'no-store' }), fetch('/api/portal/support', { cache: 'no-store' }), fetch('/api/portal/operations', { cache: 'no-store' })])
      if (summaryResponse.status === 403) { router.replace('/portal/login'); return }
      const [summary, support, operations] = await Promise.all([summaryResponse.json(), supportResponse.json(), operationsResponse.json()])
      if (!summaryResponse.ok) throw new Error(summary.error || 'Unable to load portal data.')
      setOrganizations(summary.organizations || []); setUsers(summary.portalUsers || []); setMetrics(summary.metrics || emptyMetrics)
      if (supportResponse.ok) { setTickets(support.tickets || []); setAgents(support.agents || []); setCanManageSupport(Boolean(support.canManage)) }
      if (operationsResponse.ok) { setAuditEvents(operations.auditEvents || []); setTasks(operations.tasks || []); setApprovals(operations.approvals || []); setAccess(operations.access || null) }
      setLastUpdated(new Date())
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load portal data.') } finally { setLoading(false) }
  }, [router])

  useEffect(() => { void refresh() }, [refresh])
  const value = useMemo(() => ({ organizations, users, tickets, agents, auditEvents, tasks, approvals, access, metrics, loading, error, canManageSupport, lastUpdated, refresh }), [organizations, users, tickets, agents, auditEvents, tasks, approvals, access, metrics, loading, error, canManageSupport, lastUpdated, refresh])
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() { const value = useContext(PortalContext); if (!value) throw new Error('usePortal must be used inside PortalProvider'); return value }
