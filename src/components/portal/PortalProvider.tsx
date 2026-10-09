'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationRow, PortalAccess, PortalApproval, PortalAuditEvent, PortalGovernanceSettings, PortalMetrics, PortalNotificationState, PortalReportSchedule, PortalSession, PortalSupportMacro, PortalTask, PortalTaskComment, PortalUser, SupportAgent, SupportTicket } from './types'

type PortalContextValue = { organizations: OrganizationRow[]; users: PortalUser[]; tickets: SupportTicket[]; agents: SupportAgent[]; auditEvents: PortalAuditEvent[]; tasks: PortalTask[]; approvals: PortalApproval[]; access: PortalAccess | null; sessions: PortalSession[]; notificationStates: PortalNotificationState[]; governanceSettings: PortalGovernanceSettings | null; supportMacros: PortalSupportMacro[]; reportSchedules: PortalReportSchedule[]; taskComments: PortalTaskComment[]; metrics: PortalMetrics; loading: boolean; error: string; canManageSupport: boolean; lastUpdated: Date | null; refresh: () => Promise<void> }
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
  const [sessions, setSessions] = useState<PortalSession[]>([])
  const [notificationStates, setNotificationStates] = useState<PortalNotificationState[]>([])
  const [governanceSettings, setGovernanceSettings] = useState<PortalGovernanceSettings | null>(null)
  const [supportMacros, setSupportMacros] = useState<PortalSupportMacro[]>([])
  const [reportSchedules, setReportSchedules] = useState<PortalReportSchedule[]>([])
  const [taskComments, setTaskComments] = useState<PortalTaskComment[]>([])
  const [metrics, setMetrics] = useState<PortalMetrics>(emptyMetrics)
  const [canManageSupport, setCanManageSupport] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [summaryResponse, supportResponse, operationsResponse, maturityResponse] = await Promise.all([fetch('/api/portal/summary', { cache: 'no-store' }), fetch('/api/portal/support', { cache: 'no-store' }), fetch('/api/portal/operations', { cache: 'no-store' }), fetch('/api/portal/maturity', { cache: 'no-store' })])
      if ([summaryResponse, supportResponse, operationsResponse, maturityResponse].some((response) => response.status === 401 || response.status === 403)) { router.replace('/portal/login'); return }
      const [summary, support, operations, maturity] = await Promise.all([summaryResponse.json(), supportResponse.json(), operationsResponse.json(), maturityResponse.json()])
      if (!summaryResponse.ok) throw new Error(summary.error || 'Unable to load portal data.')
      const partialErrors = [!supportResponse.ok ? support.error || 'Support data is unavailable.' : '', !operationsResponse.ok ? operations.error || 'Operations data is unavailable.' : '', !maturityResponse.ok ? maturity.error || 'Enterprise controls are unavailable.' : ''].filter(Boolean)
      setOrganizations(summary.organizations || []); setUsers(summary.portalUsers || []); setMetrics(summary.metrics || emptyMetrics)
      if (supportResponse.ok) { setTickets(support.tickets || []); setAgents(support.agents || []); setCanManageSupport(Boolean(support.canManage)) }
      if (operationsResponse.ok) { setAuditEvents(operations.auditEvents || []); setTasks(operations.tasks || []); setApprovals(operations.approvals || []); setAccess(operations.access || null) }
      if (maturityResponse.ok) { setSessions(maturity.sessions || []); setNotificationStates(maturity.notificationStates || []); setGovernanceSettings(maturity.governanceSettings || null); setSupportMacros(maturity.supportMacros || []); setReportSchedules(maturity.reportSchedules || []); setTaskComments(maturity.taskComments || []) }
      if (partialErrors.length) setError(partialErrors.join(' '))
      setLastUpdated(new Date())
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load portal data.') } finally { setLoading(false) }
  }, [router])

  useEffect(() => { void refresh() }, [refresh])
  const value = useMemo(() => ({ organizations, users, tickets, agents, auditEvents, tasks, approvals, access, sessions, notificationStates, governanceSettings, supportMacros, reportSchedules, taskComments, metrics, loading, error, canManageSupport, lastUpdated, refresh }), [organizations, users, tickets, agents, auditEvents, tasks, approvals, access, sessions, notificationStates, governanceSettings, supportMacros, reportSchedules, taskComments, metrics, loading, error, canManageSupport, lastUpdated, refresh])
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() { const value = useContext(PortalContext); if (!value) throw new Error('usePortal must be used inside PortalProvider'); return value }
