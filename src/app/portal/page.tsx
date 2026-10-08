'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  DoorOpen,
  FileText,
  HardDrive,
  History,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Mail,
  PauseCircle,
  Phone,
  Plus,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserRoundCog,
  Users,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  BILLING_PLANS,
  getBillingPlan,
  type BillingPlanKey,
} from '@/lib/billing-plans'

type OrganizationRow = {
  id: string
  name: string
  slug: string
  status: string
  plan: BillingPlanKey
  created_at: string
  plan_name: string
  monthly_price: number | null
  user_limit: number | null
  staff_limit: number | null
  user_count: number
  staff_count: number
  subscription_status: string | null
  subscription_period_end: string | null
}

type PortalUser = {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

type Metrics = {
  organizations: number
  activeOrganizations: number
  suspendedOrganizations: number
  cancelledSubscriptions: number
  monthlyRevenue: number
  annualRevenue: number
  users: number
  staff: number
}

type OrganizationUser = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
}

type StaffAccount = {
  id: string
  full_name: string
  employee_code: string
  email: string | null
  phone: string | null
  staff_type: string | null
  status: string
  profile_id: string | null
  created_at: string
}

type OrganizationDetail = {
  organization: OrganizationRow & { updated_at: string; owner_profile_id: string | null; lifecycle_stage: string; trial_started_at: string | null; trial_ends_at: string | null; cancellation_scheduled_at: string | null; cancelled_at: string | null; cancellation_reason: string | null; billing_contact_email: string | null; technical_contact_email: string | null; data_protection_contact_email: string | null; customer_lifetime_value: number; last_customer_contact_at: string | null; next_follow_up_at: string | null; churn_risk_reason: string | null }
  accountOwner: OrganizationUser | null
  users: OrganizationUser[]
  staff: StaffAccount[]
  subscription: {
    id: string
    provider: string
    provider_customer_id: string | null
    provider_subscription_id: string | null
    status: string
    plan: string
    current_period_end: string | null
    created_at: string
  } | null
  usage: {
    usage: { users: number; staff: number; ids: number; activeIds: number; documents: number; devices: number; securityAlerts: number; storageMb: number }
    limits: { users: number | null; staff: number | null; storageMb: number }
    percentages: { users: number; staff: number; storage: number }
    isOverLimit: { users: boolean; staff: boolean }
  }
  activity: Array<{ id: string; action_type: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string }>
  securityEvents: Array<{ id: string; event_type: string; severity: string; reviewed_at: string | null; created_at: string }>
  supportTickets: Array<{ id: string; ticket_number: string; subject: string; category: string; priority: string; status: string; response_summary: string | null; created_at: string; updated_at: string }>
  billingEvents: Array<{ id: string; event_type: string; status: string; provider_event_id: string | null; created_at: string }>
  portalNotes: Array<{ id: string; action_type: string; metadata: Record<string, unknown>; created_at: string }>
  supportTasks: Array<{ id: string; title: string; description: string | null; status: string; priority: string; due_at: string | null; completed_at: string | null; created_at: string }>
  approvals: Array<{ id: string; action_type: string; entity_type: string; status: string; review_note: string | null; reviewed_at: string | null; expires_at: string | null; created_at: string }>
  ownerTransfers: Array<{ id: string; previous_owner_profile_id: string | null; new_owner_profile_id: string; reason: string; created_at: string }>
  planHistory: Array<{ id: string; previous_plan: string | null; new_plan: string; change_type: string; effective_at: string; created_at: string }>
}

const STATUS_OPTIONS = ['active', 'trialing', 'paused', 'suspended', 'archived']

export default function PortalPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ organizations: 0, activeOrganizations: 0, suspendedOrganizations: 0, cancelledSubscriptions: 0, monthlyRevenue: 0, annualRevenue: 0, users: 0, staff: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '' })
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationRow | null>(null)
  const [organizationDetail, setOrganizationDetail] = useState<OrganizationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const loadPortal = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/portal/summary', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 403) router.replace('/portal/login')
        setError(result.error || 'Unable to load portal.')
        return
      }
      setOrganizations(result.organizations || [])
      setPortalUsers(result.portalUsers || [])
      setMetrics(result.metrics)
      setLastUpdated(new Date())
    } catch {
      setError('Something went wrong while loading the portal.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadPortal) }, [loadPortal])

  useEffect(() => {
    if (!selectedOrganization) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedOrganization(null) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedOrganization])

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return organizations.filter((organization) => {
      const matchesQuery = !query || [organization.name, organization.slug, organization.id, organization.plan].some((value) => value.toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'all' || organization.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [organizations, search, statusFilter])

  const planMix = useMemo(() => BILLING_PLANS.map((plan) => ({ ...plan, count: organizations.filter((organization) => organization.plan === plan.key).length })).filter((plan) => plan.count > 0), [organizations])
  const attentionOrganizations = useMemo(() => organizations.filter((organization) => isCancelledSubscription(organization.subscription_status) || organization.status === 'suspended' || organization.status === 'paused' || utilization(organization.staff_count, organization.staff_limit) >= 85), [organizations])
  const paidOrganizations = organizations.filter((organization) => !['free'].includes(organization.plan) && ['active', 'trialing'].includes(organization.status)).length
  const averageRevenue = metrics.activeOrganizations ? Math.round(metrics.monthlyRevenue / metrics.activeOrganizations) : 0

  const updateOrganization = async (organization: OrganizationRow, updates: Partial<Pick<OrganizationRow, 'status' | 'plan'>>) => {
    setSavingId(organization.id)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/platform/organizations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization_id: organization.id, status: updates.status || organization.status, plan: updates.plan || organization.plan }) })
      const result = await response.json()
      if (!response.ok) { setError(result.error || 'Unable to update organization.'); return }
      setMessage(`${organization.name} updated.`)
      await loadPortal()
    } catch {
      setError('Something went wrong while updating organization.')
    } finally {
      setSavingId('')
    }
  }

  const openOrganization = async (organization: OrganizationRow) => {
    setSelectedOrganization(organization)
    setOrganizationDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/portal/organizations/${organization.id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 403) router.replace('/portal/login')
        setDetailError(result.error || 'Unable to load organization details.')
        return
      }
      setOrganizationDetail(result)
    } catch {
      setDetailError('Something went wrong while loading organization details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const createPortalUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreatingUser(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/portal/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) })
      const result = await response.json()
      if (!response.ok) { setError(result.error || 'Unable to create portal user.'); return }
      setPortalUsers((current) => [result.profile, ...current])
      setUserForm({ full_name: '', email: '', password: '' })
      setMessage('Portal user created.')
    } catch {
      setError('Something went wrong while creating portal user.')
    } finally {
      setCreatingUser(false)
    }
  }

  const logout = async () => { await supabase.auth.signOut(); router.replace('/portal/login') }

  return (
    <main className="min-h-screen bg-[#0c1210] px-3 py-3 text-white sm:px-5 sm:py-5 lg:px-7">
      <div className="mx-auto max-w-[1580px] space-y-5">
        <header className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#121c18] px-5 py-5 shadow-2xl shadow-black/20 sm:px-7">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[42px] border-[#b8f43d]/10" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#b8f43d] text-[#10150f]"><ShieldCheck className="h-6 w-6" /></div>
              <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b8f43d]">Digital ID X · Platform operations</p><h1 className="mt-1 text-2xl font-black tracking-[-0.04em] sm:text-3xl">Command center</h1><p className="mt-1 text-sm text-white/50">Commercial health, tenant capacity, access, and intervention in one view.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Preparing live data'}</span>
              <button type="button" onClick={() => void loadPortal()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black transition hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
              <button type="button" onClick={logout} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#10150f]"><LogOut className="h-4 w-4" />Logout</button>
            </div>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-[#b8f43d]/20 bg-[#b8f43d]/10 px-4 py-3 text-sm font-bold text-[#d8ff83]">{message}</div> : null}

        {loading && organizations.length === 0 ? <PortalSkeleton /> : <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric title="Monthly recurring revenue" value={`£${metrics.monthlyRevenue.toLocaleString()}`} detail={`£${metrics.annualRevenue.toLocaleString()} annual run rate`} icon={<CircleDollarSign />} tone="lime" />
            <Metric title="Organizations" value={metrics.organizations.toLocaleString()} detail={`${metrics.activeOrganizations} active · ${metrics.cancelledSubscriptions} cancelled`} icon={<Building2 />} />
            <Metric title="People managed" value={(metrics.users + metrics.staff).toLocaleString()} detail={`${metrics.users} system users · ${metrics.staff} staff`} icon={<Users />} />
            <Metric title="Revenue quality" value={`${paidOrganizations} paid`} detail={`£${averageRevenue.toLocaleString()} average per active org`} icon={<TrendingUp />} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.45fr)]">
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#f7f8f5] text-[#152019]">
              <div className="border-b border-black/10 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#65806f]">Tenant operations</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Organizations and billing</h2><p className="mt-1 text-sm text-[#647168]">Search, review capacity, change packages, and control access.</p></div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="flex h-10 min-w-64 items-center gap-2 rounded-xl border border-black/10 bg-white px-3"><Search className="h-4 w-4 text-[#718078]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, slug, ID or plan" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" /></label>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-bold capitalize outline-none"><option value="all">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-[#edf0eb]"><tr className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#68766e]"><th className="px-5 py-3.5">Organization</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Package</th><th className="px-5 py-3.5">Billing</th><th className="px-5 py-3.5">Seat capacity</th><th className="px-5 py-3.5">Staff capacity</th><th className="px-5 py-3.5 text-right">Control</th></tr></thead>
                  <tbody>{filteredOrganizations.map((organization) => <OrganizationRowView key={organization.id} organization={organization} saving={savingId === organization.id} onUpdate={updateOrganization} onOpen={openOrganization} />)}</tbody>
                </table>
                {filteredOrganizations.length === 0 ? <div className="px-6 py-16 text-center"><Search className="mx-auto h-6 w-6 text-[#8c9891]" /><p className="mt-3 font-black">No organizations match</p><p className="mt-1 text-sm text-[#718078]">Try a broader search or another status.</p></div> : null}
              </div>
              <div className="flex items-center justify-between border-t border-black/10 bg-white px-5 py-3 text-xs font-bold text-[#68766e]"><span>Showing {filteredOrganizations.length} of {organizations.length}</span><span>All changes are audited</span></div>
            </div>

            <aside className="space-y-5">
              <Panel eyebrow="Portfolio" title="Plan distribution" icon={<BadgeDollarSign className="h-4 w-4" />}>
                <div className="space-y-3">{planMix.map((plan) => <div key={plan.key}><div className="flex items-center justify-between text-xs"><span className="font-black">{plan.name}</span><span className="font-bold text-slate-500">{plan.count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#9ed52c]" style={{ width: `${Math.max(8, (plan.count / Math.max(organizations.length, 1)) * 100)}%` }} /></div></div>)}</div>
              </Panel>

              <Panel eyebrow="Intervention" title="Needs attention" icon={<Activity className="h-4 w-4" />}>
                <div className="space-y-2">{attentionOrganizations.slice(0, 5).map((organization) => <button type="button" onClick={() => void openOrganization(organization)} key={organization.id} className="flex w-full items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-3 text-left transition hover:bg-amber-100"><div className="min-w-0"><p className="truncate text-sm font-black">{organization.name}</p><p className="mt-0.5 text-[11px] font-semibold text-amber-800">{isCancelledSubscription(organization.subscription_status) ? `Subscription ${formatRole(organization.subscription_status || 'cancelled')}${organization.subscription_period_end ? ` · ended ${formatPortalDate(organization.subscription_period_end)}` : ''}` : organization.status === 'suspended' ? 'Access suspended' : organization.status === 'paused' ? 'Workspace paused' : `${utilization(organization.staff_count, organization.staff_limit)}% staff capacity`}</p></div><ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" /></button>)}{attentionOrganizations.length === 0 ? <p className="rounded-xl bg-emerald-50 px-3 py-4 text-sm font-bold text-emerald-800">No tenant intervention required.</p> : null}</div>
              </Panel>
            </aside>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.65fr)]">
            <div className="rounded-[26px] border border-white/10 bg-[#121c18] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b8f43d]">Privileged access</p><h2 className="mt-1 text-xl font-black">Portal administrators</h2><p className="mt-1 text-sm text-white/45">Platform-level users who can view and control every tenant.</p></div><UserRoundCog className="h-5 w-5 text-white/40" /></div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">{portalUsers.map((user) => <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b8f43d] text-sm font-black text-[#10150f]">{user.full_name?.charAt(0)?.toUpperCase() || 'P'}</span><div className="min-w-0"><p className="truncate text-sm font-black">{user.full_name}</p><p className="mt-1 truncate text-xs text-white/45">{user.email}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b8f43d]">{user.is_active ? 'Active platform owner' : 'Inactive'}</p></div></div>)}</div>
            </div>

            <section className="rounded-[26px] bg-[#b8f43d] p-5 text-[#10150f] sm:p-6">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10150f] text-[#b8f43d]"><Plus className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">Access control</p><h2 className="text-lg font-black">Create portal administrator</h2></div></div>
              <form onSubmit={createPortalUser} className="mt-5 grid gap-3"><input value={userForm.full_name} onChange={(event) => setUserForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Full name" className="h-11 rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-bold outline-none focus:bg-white" required /><input value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" type="email" className="h-11 rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-bold outline-none focus:bg-white" required /><input value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} placeholder="Temporary password · 8+ characters" type="password" minLength={8} className="h-11 rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-bold outline-none focus:bg-white" required /><button disabled={creatingUser} className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#10150f] px-4 text-sm font-black text-white disabled:opacity-60">{creatingUser ? 'Creating administrator…' : 'Create administrator'}<ChevronRight className="h-4 w-4" /></button></form>
              <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 opacity-65"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />This grants cross-tenant platform control. Create accounts only for trusted operators.</p>
            </section>
          </section>
        </>}
      </div>
      {selectedOrganization ? <OrganizationDrawer organization={selectedOrganization} detail={organizationDetail} loading={detailLoading} error={detailError} onClose={() => setSelectedOrganization(null)} onRefresh={() => void openOrganization(selectedOrganization)} /> : null}
    </main>
  )
}

function OrganizationRowView({ organization, saving, onUpdate, onOpen }: { organization: OrganizationRow; saving: boolean; onUpdate: (organization: OrganizationRow, updates: Partial<Pick<OrganizationRow, 'status' | 'plan'>>) => Promise<void>; onOpen: (organization: OrganizationRow) => void }) {
  const plan = getBillingPlan(organization.plan)
  const staffPercent = utilization(organization.staff_count, plan.staffLimit)
  const userPercent = utilization(organization.user_count, plan.userLimit)
  return <tr className={`border-b border-black/10 bg-white transition hover:bg-[#fafbf8] last:border-0 ${isCancelledSubscription(organization.subscription_status) ? 'bg-red-50/40' : ''}`}><td className="px-5 py-4"><button type="button" onClick={() => onOpen(organization)} className="group flex items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8efdf] text-sm font-black text-[#3b5322] transition group-hover:bg-[#b8f43d]">{organization.name.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="max-w-52 truncate text-sm font-black group-hover:underline">{organization.name}</p><p className="mt-1 max-w-52 truncate font-mono text-[10px] font-bold text-[#7a877f]">/{organization.slug}</p></div></button></td><td className="px-5 py-4"><select value={organization.status} disabled={saving} onChange={(event) => void onUpdate(organization, { status: event.target.value })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black capitalize outline-none disabled:opacity-50">{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></td><td className="px-5 py-4"><select value={organization.plan} disabled={saving} onChange={(event) => void onUpdate(organization, { plan: event.target.value as BillingPlanKey })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black outline-none disabled:opacity-50">{BILLING_PLANS.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></td><td className="px-5 py-4"><p className="text-sm font-black">{plan.monthlyPrice === null ? 'Custom' : `£${plan.monthlyPrice}`}</p><p className={`mt-1 text-[9px] font-black uppercase tracking-wide ${isCancelledSubscription(organization.subscription_status) ? 'text-red-700' : 'text-[#718078]'}`}>{organization.subscription_status ? formatRole(organization.subscription_status) : organization.plan === 'free' ? 'Free plan' : 'No billing record'}</p></td><td className="px-5 py-4"><Capacity value={organization.user_count} limit={plan.userLimit} percent={userPercent} label="users" /></td><td className="px-5 py-4"><Capacity value={organization.staff_count} limit={plan.staffLimit} percent={staffPercent} label="staff" /></td><td className="px-5 py-4"><div className="flex items-center justify-end gap-2"><button type="button" onClick={() => onOpen(organization)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#152019] px-3 py-2 text-xs font-black text-white">Details<ChevronRight className="h-3.5 w-3.5" /></button>{organization.status === 'suspended' ? <button disabled={saving} onClick={() => void onUpdate(organization, { status: 'active' })} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />Reactivate</button> : <button disabled={saving} onClick={() => void onUpdate(organization, { status: 'suspended' })} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-50"><PauseCircle className="h-3.5 w-3.5" />Suspend</button>}</div></td></tr>
}

function OrganizationDrawer({ organization, detail, loading, error, onClose, onRefresh }: { organization: OrganizationRow; detail: OrganizationDetail | null; loading: boolean; error: string; onClose: () => void; onRefresh: () => void }) {
  const [activeSection, setActiveSection] = useState<'overview' | 'lifecycle' | 'billing' | 'users' | 'staff' | 'security' | 'activity' | 'support'>('overview')
  const [enterReason, setEnterReason] = useState('')
  const [entering, setEntering] = useState(false)
  const [enterError, setEnterError] = useState('')
  const [supportNote, setSupportNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [lifecycleStage, setLifecycleStage] = useState('')
  const [lifecycleSaving, setLifecycleSaving] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'normal', due_at: '' })
  const [ownerProfileId, setOwnerProfileId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const data = detail?.organization || organization
  const subscription = detail?.subscription
  const health = detail ? organizationHealth(detail) : { score: 0, label: 'Loading', tone: 'text-white/50' }

  const copyOrganizationId = async () => {
    await navigator.clipboard.writeText(organization.id)
  }

  const enterOrganization = async () => {
    if (enterReason.trim().length < 8) { setEnterError('Enter a support reason of at least 8 characters.'); return }
    setEntering(true)
    setEnterError('')
    try {
      const response = await fetch('/api/platform/organizations/enter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization_id: organization.id, reason: enterReason }) })
      const result = await response.json()
      if (!response.ok) { setEnterError(result.error || 'Unable to enter organization.'); return }
      window.location.assign(result.redirect_to || '/dashboard')
    } catch {
      setEnterError('Unable to enter organization right now.')
    } finally {
      setEntering(false)
    }
  }

  const saveSupportNote = async () => {
    setNoteSaving(true)
    setActionMessage('')
    try {
      const response = await fetch(`/api/portal/organizations/${organization.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: supportNote }) })
      const result = await response.json()
      if (!response.ok) { setActionMessage(result.error || 'Unable to save note.'); return }
      setSupportNote('')
      setActionMessage('Private note saved.')
      onRefresh()
    } catch {
      setActionMessage('Unable to save note.')
    } finally {
      setNoteSaving(false)
    }
  }

  const updateUser = async (person: OrganizationUser, changes: { is_active?: boolean; role?: string }) => {
    const description = changes.role ? `change ${person.full_name}'s role to ${formatRole(changes.role)}` : `${changes.is_active ? 'activate' : 'deactivate'} ${person.full_name}`
    if (!window.confirm(`Confirm that you want to ${description}. This action will be audited.`)) return
    setActionMessage('')
    try {
      const response = await fetch(`/api/portal/organizations/${organization.id}/users`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: person.id, confirmation: 'CONFIRM', ...changes }) })
      const result = await response.json()
      if (!response.ok) { setActionMessage(result.error || 'Unable to update user.'); return }
      setActionMessage(`${person.full_name} updated.`)
      onRefresh()
    } catch {
      setActionMessage('Unable to update user.')
    }
  }

  const updateLifecycle = async () => {
    if (!detail) return
    const stage = lifecycleStage || detail.organization.lifecycle_stage
    if (!window.confirm(`Confirm lifecycle change to ${formatRole(stage)}. This action will be audited.`)) return
    setLifecycleSaving(true); setActionMessage('')
    const response = await fetch(`/api/portal/organizations/${organization.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'CONFIRM', lifecycle_stage: stage }) })
    const result = await response.json()
    setLifecycleSaving(false)
    if (!response.ok) { setActionMessage(result.error || 'Unable to update lifecycle.'); return }
    setActionMessage('Customer lifecycle updated.'); onRefresh()
  }

  const createTask = async () => {
    setNoteSaving(true); setActionMessage('')
    const response = await fetch(`/api/portal/organizations/${organization.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'task', ...taskForm, due_at: taskForm.due_at ? new Date(taskForm.due_at).toISOString() : null }) })
    const result = await response.json(); setNoteSaving(false)
    if (!response.ok) { setActionMessage(result.error || 'Unable to create task.'); return }
    setTaskForm({ title: '', priority: 'normal', due_at: '' }); setActionMessage('Support task created.'); onRefresh()
  }

  const transferOwner = async () => {
    if (!ownerProfileId || transferReason.trim().length < 8) { setActionMessage('Choose an owner and enter a transfer reason of at least 8 characters.'); return }
    const nextOwner = detail?.users.find((user) => user.id === ownerProfileId)
    if (!window.confirm(`Transfer account ownership to ${nextOwner?.full_name || 'this user'}? This action will be audited.`)) return
    setLifecycleSaving(true); setActionMessage('')
    const response = await fetch(`/api/portal/organizations/${organization.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'CONFIRM', owner_profile_id: ownerProfileId, transfer_reason: transferReason }) })
    const result = await response.json(); setLifecycleSaving(false)
    if (!response.ok) { setActionMessage(result.error || 'Unable to transfer ownership.'); return }
    setTransferReason(''); setOwnerProfileId(''); setActionMessage('Account ownership transferred.'); onRefresh()
  }

  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${organization.name} details`}>
    <button type="button" aria-label="Close organization details" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
    <aside className="relative flex h-full w-full max-w-[760px] flex-col overflow-hidden border-l border-white/10 bg-[#f5f7f2] text-[#152019] shadow-2xl">
      <header className="relative overflow-hidden bg-[#101a16] px-5 pb-5 pt-5 text-white sm:px-7 sm:pt-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[32px] border-[#b8f43d]/10" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#b8f43d] text-lg font-black text-[#10150f]">{organization.name.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b8f43d]">Organization intelligence</p><h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em]">{organization.name}</h2><p className="mt-1 font-mono text-xs text-white/45">/{organization.slug}</p></div></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10" aria-label="Close drawer"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#b8f43d] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#10150f]">{data.plan_name || getBillingPlan(data.plan).name}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white/70">{data.status}</span><span className={`rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${health.tone}`}>{health.score} · {health.label}</span><span className="text-xs font-semibold text-white/45">{organization.user_count} users · {organization.staff_count} staff</span></div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-black/10 bg-white px-5 py-3 sm:px-7" aria-label="Organization detail sections">
        {(['overview', 'lifecycle', 'billing', 'users', 'staff', 'security', 'activity', 'support'] as const).map((section) => <button key={section} type="button" onClick={() => setActiveSection(section)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black capitalize transition ${activeSection === section ? 'bg-[#152019] text-white' : 'text-[#657269] hover:bg-[#eef1eb]'}`}>{section}{section === 'users' && detail ? ` (${detail.users.length})` : ''}{section === 'staff' && detail ? ` (${detail.staff.length})` : ''}</button>)}
      </nav>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        {loading ? <DrawerSkeleton /> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div> : detail ? <>
          {isCancelledSubscription(subscription?.status) ? <section className="mb-5 rounded-[20px] border border-red-200 bg-red-50 p-4 text-red-900"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Subscription cancelled</p><p className="mt-1 text-sm font-semibold leading-5">This organization is no longer contributing to recurring revenue.{subscription?.current_period_end ? ` The recorded subscription period ended on ${formatPortalDate(subscription.current_period_end)}.` : ' No final access date is recorded.'}</p></div></div></section> : null}
          {activeSection === 'overview' ? <div className="space-y-5">
            <section className="rounded-[22px] bg-[#b8f43d] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-60">Permanent organization ID</p><p className="mt-2 break-all font-mono text-sm font-black">{detail.organization.id}</p></div><button type="button" onClick={() => void copyOrganizationId()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10150f] text-[#b8f43d]" aria-label="Copy organization ID"><Copy className="h-4 w-4" /></button></div></section>

            <section className="grid gap-3 sm:grid-cols-2"><DetailStat icon={<CalendarDays />} label="Organization created" value={formatPortalDate(detail.organization.created_at)} /><DetailStat icon={<CreditCard />} label="Subscribed on" value={subscription ? formatPortalDate(subscription.created_at) : 'No subscription record'} /><DetailStat icon={<CalendarDays />} label="Current period ends" value={subscription?.current_period_end ? formatPortalDate(subscription.current_period_end) : 'No renewal date'} /><DetailStat icon={<CreditCard />} label="Billing source" value={subscription ? `${subscription.provider} · ${subscription.status}` : 'Free / not connected'} /></section>

            <section className="rounded-[22px] border border-black/10 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#718078]">Account ownership</p><h3 className="mt-1 text-lg font-black">Account owner</h3></div><UserRoundCog className="h-5 w-5 text-[#79905f]" /></div>{detail.accountOwner ? <PersonCard person={detail.accountOwner} owner /> : <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">No account owner is assigned.</p>}<p className="mt-3 text-[11px] font-semibold leading-5 text-[#718078]">This is the accountable owner stored on the organization. Ownership transfers are recorded permanently in the lifecycle history.</p></section>

            <section className="grid gap-3 sm:grid-cols-3"><CountCard value={detail.users.length} label="Account users" /><CountCard value={detail.staff.length} label="Staff records" /><CountCard value={detail.staff.filter((person) => person.profile_id).length} label="Staff logins" /></section>

            <section className="rounded-[22px] border border-black/10 bg-white p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#152019] text-[#b8f43d]"><DoorOpen className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#718078]">Audited support access</p><h3 className="text-lg font-black">Enter this organization</h3></div></div><p className="mt-3 text-sm leading-6 text-[#657269]">Open the customer dashboard for troubleshooting. Access expires after 30 minutes and the reason is written to the audit log.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={enterReason} onChange={(event) => setEnterReason(event.target.value)} placeholder="Reason for support access" className="h-11 min-w-0 flex-1 rounded-xl border border-black/10 bg-[#f5f7f2] px-3 text-sm font-semibold outline-none focus:border-[#7ca52b]" /><button type="button" onClick={() => void enterOrganization()} disabled={entering} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#152019] px-4 text-sm font-black text-white disabled:opacity-60"><DoorOpen className="h-4 w-4" />{entering ? 'Entering…' : 'Enter workspace'}</button></div>{enterError ? <p className="mt-2 text-xs font-bold text-red-700">{enterError}</p> : null}</section>
          </div> : null}

          {activeSection === 'lifecycle' ? <div className="space-y-5">
            <SectionHeading icon={<TrendingUp />} title="Customer lifecycle" subtitle="Ownership, commercial health, follow-ups, and account history in one operational view." />
            {actionMessage ? <p className="rounded-xl bg-[#edf2e8] px-4 py-3 text-sm font-bold text-[#506637]">{actionMessage}</p> : null}
            <section className="rounded-[22px] border border-black/10 bg-white p-5"><div className="grid gap-4 sm:grid-cols-[1fr_auto]"><label className="text-sm font-black">Lifecycle stage<select value={lifecycleStage || detail.organization.lifecycle_stage} onChange={(event) => setLifecycleStage(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#f5f7f2] px-3 text-sm font-bold capitalize outline-none focus:border-[#7ca52b]"><option value="lead">Lead</option><option value="trial">Trial</option><option value="active">Active</option><option value="at_risk">At risk</option><option value="cancellation_scheduled">Cancellation scheduled</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option></select></label><button type="button" onClick={() => void updateLifecycle()} disabled={lifecycleSaving} className="self-end rounded-xl bg-[#152019] px-5 py-3 text-xs font-black text-white disabled:opacity-50">{lifecycleSaving ? 'Updating…' : 'Update stage'}</button></div></section>
            <div className="grid gap-3 sm:grid-cols-2"><DetailStat icon={<UserRoundCog />} label="Account owner" value={detail.accountOwner?.full_name || 'Unassigned'} /><DetailStat icon={<CircleDollarSign />} label="Customer lifetime value" value={`£${Number(detail.organization.customer_lifetime_value || 0).toLocaleString()}`} /><DetailStat icon={<CalendarDays />} label="Next follow-up" value={detail.organization.next_follow_up_at ? formatPortalDate(detail.organization.next_follow_up_at) : 'Not scheduled'} /><DetailStat icon={<ShieldAlert />} label="Churn risk" value={detail.organization.churn_risk_reason || 'No risk recorded'} /></div>
            <section className="rounded-[22px] border border-black/10 bg-white p-5"><h4 className="font-black">Transfer account ownership</h4><p className="mt-1 text-xs font-semibold leading-5 text-[#718078]">Choose an active account user. The previous owner, new owner, operator, reason, and time are preserved.</p><div className="mt-4 grid gap-3"><select value={ownerProfileId} onChange={(event) => setOwnerProfileId(event.target.value)} className="h-11 rounded-xl border border-black/10 bg-[#f5f7f2] px-3 text-sm font-bold outline-none focus:border-[#7ca52b]"><option value="">Choose new owner</option>{detail.users.filter((user) => user.is_active && user.id !== detail.accountOwner?.id).map((user) => <option key={user.id} value={user.id}>{user.full_name} · {formatRole(user.role)}</option>)}</select><input value={transferReason} onChange={(event) => setTransferReason(event.target.value)} placeholder="Reason for ownership transfer" className="h-11 rounded-xl border border-black/10 bg-[#f5f7f2] px-3 text-sm font-semibold outline-none focus:border-[#7ca52b]" /><button type="button" onClick={() => void transferOwner()} disabled={lifecycleSaving || !ownerProfileId} className="justify-self-start rounded-xl bg-[#b8f43d] px-4 py-2.5 text-xs font-black text-[#10150f] disabled:opacity-40">Transfer ownership</button></div></section>
            <div className="grid gap-5 lg:grid-cols-2"><Directory title="Plan history" subtitle="Commercial plan movements and their effective dates." empty="No plan changes recorded.">{detail.planHistory.map((event) => <EventCard key={event.id} title={`${formatRole(event.previous_plan || 'new')} → ${formatRole(event.new_plan)}`} meta={`Effective ${formatPortalDateTime(event.effective_at)}`} status={formatRole(event.change_type)} />)}</Directory><Directory title="Owner history" subtitle="Audited transfers between accountable users." empty="No ownership transfers recorded.">{detail.ownerTransfers.map((event) => <EventCard key={event.id} title="Ownership transferred" meta={`${event.reason} · ${formatPortalDateTime(event.created_at)}`} status={event.new_owner_profile_id.slice(0, 8)} />)}</Directory></div>
            {detail.organization.cancellation_reason ? <section className="rounded-[22px] border border-red-200 bg-red-50 p-5"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-red-700">Cancellation intelligence</p><p className="mt-2 text-sm font-black text-red-950">{detail.organization.cancellation_reason}</p><p className="mt-2 text-xs font-semibold text-red-800">{detail.organization.cancelled_at ? `Cancelled ${formatPortalDateTime(detail.organization.cancelled_at)}` : detail.organization.cancellation_scheduled_at ? `Scheduled ${formatPortalDateTime(detail.organization.cancellation_scheduled_at)}` : 'Cancellation date not recorded'}</p></section> : null}
          </div> : null}

          {activeSection === 'billing' ? <div className="space-y-5"><SectionHeading icon={<ReceiptText />} title="Billing and subscription" subtitle="Commercial status, renewal timing, and provider references." /><div className="grid gap-3 sm:grid-cols-2"><DetailStat icon={<CreditCard />} label="Plan" value={getBillingPlan(detail.organization.plan).name} /><DetailStat icon={<ReceiptText />} label="Subscription status" value={subscription?.status || 'No subscription'} /><DetailStat icon={<CalendarDays />} label="Subscribed on" value={subscription ? formatPortalDate(subscription.created_at) : 'Not subscribed'} /><DetailStat icon={<CalendarDays />} label="Current period ends" value={subscription?.current_period_end ? formatPortalDate(subscription.current_period_end) : 'No renewal date'} /></div><ReferenceCard label="Stripe customer" value={subscription?.provider_customer_id} /><ReferenceCard label="Stripe subscription" value={subscription?.provider_subscription_id} /><Directory title="Billing event history" subtitle="Webhook-confirmed subscription and payment lifecycle events." empty="No billing events recorded.">{detail.billingEvents.map((event) => <EventCard key={event.id} title={formatRole(event.event_type)} meta={`${event.provider_event_id || 'Internal event'} · ${formatPortalDateTime(event.created_at)}`} status={event.status} />)}</Directory><p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-900">Invoices and disputes remain authoritative in Stripe. This timeline shows the webhook events successfully recorded by the platform.</p></div> : null}

          {activeSection === 'users' ? <div className="space-y-3">{actionMessage ? <p className="rounded-xl bg-[#edf2e8] px-4 py-3 text-sm font-bold text-[#506637]">{actionMessage}</p> : null}<Directory title="Account users" subtitle="Change roles or suspend system access. Every action requires confirmation and is audited." empty="No account users found.">{detail.users.map((user) => <PersonCard key={user.id} person={user} owner={user.id === detail.accountOwner?.id} onToggle={() => void updateUser(user, { is_active: !user.is_active })} onRoleChange={(role) => void updateUser(user, { role })} />)}</Directory></div> : null}

          {activeSection === 'staff' ? <Directory title="Staff accounts" subtitle="Every staff record in this organization, including login status." empty="No staff records found.">{detail.staff.map((person) => <StaffCard key={person.id} person={person} />)}</Directory> : null}

          {activeSection === 'security' ? <div className="space-y-5"><SectionHeading icon={<LockKeyhole />} title="Security and usage" subtitle="Capacity, storage, devices, and recent security signals." /><div className="grid gap-3 sm:grid-cols-2"><UsageCard icon={<Users />} label="System users" value={detail.usage.usage.users} limit={detail.usage.limits.users} percent={detail.usage.percentages.users} /><UsageCard icon={<Users />} label="Staff records" value={detail.usage.usage.staff} limit={detail.usage.limits.staff} percent={detail.usage.percentages.staff} /><UsageCard icon={<HardDrive />} label="Storage" value={detail.usage.usage.storageMb} limit={detail.usage.limits.storageMb} percent={detail.usage.percentages.storage} suffix=" MB" /><UsageCard icon={<FileText />} label="Documents" value={detail.usage.usage.documents} limit={null} percent={0} /></div><div className="grid gap-3 sm:grid-cols-3"><CountCard value={detail.usage.usage.devices} label="Known devices" /><CountCard value={detail.usage.usage.activeIds} label="Active IDs" /><CountCard value={detail.usage.usage.securityAlerts} label="Security events" /></div><Directory title="Recent security events" subtitle="Latest signals requiring platform awareness." empty="No security events recorded.">{detail.securityEvents.map((event) => <EventCard key={event.id} title={formatRole(event.event_type)} meta={`${event.severity} · ${formatPortalDateTime(event.created_at)}`} status={event.reviewed_at ? 'Reviewed' : 'Open'} />)}</Directory></div> : null}

          {activeSection === 'activity' ? <div className="space-y-5"><SectionHeading icon={<History />} title="Activity timeline" subtitle="The latest audited changes across this organization." /><Directory title="Recent activity" subtitle={`${detail.activity.length} latest recorded actions.`} empty="No activity recorded.">{detail.activity.map((event) => <EventCard key={event.id} title={formatRole(event.action_type)} meta={`${formatRole(event.entity_type)} · ${formatPortalDateTime(event.created_at)}`} status={actorName(event.metadata)} />)}</Directory></div> : null}

          {activeSection === 'support' ? <div className="space-y-5"><SectionHeading icon={<LifeBuoy />} title="Support operations" subtitle="Customer requests, accountable follow-up work, approvals, and private operator context." />{actionMessage ? <p className="rounded-xl bg-[#edf2e8] px-4 py-3 text-sm font-bold text-[#506637]">{actionMessage}</p> : null}<section className="rounded-[22px] border border-black/10 bg-white p-5"><h4 className="font-black">Create internal task</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Follow-up task" className="h-11 rounded-xl border border-black/10 bg-[#f5f7f2] px-3 text-sm font-semibold outline-none focus:border-[#7ca52b]" /><select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))} className="h-11 rounded-xl border border-black/10 bg-[#f5f7f2] px-3 text-sm font-bold outline-none focus:border-[#7ca52b]"><option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option><option value="urgent">Urgent priority</option></select><input type="datetime-local" value={taskForm.due_at} onChange={(event) => setTaskForm((current) => ({ ...current, due_at: event.target.value }))} className="h-11 rounded-xl border border-black/10 bg-[#f5f7f2] px-3 text-sm font-semibold outline-none focus:border-[#7ca52b]" /><button type="button" onClick={() => void createTask()} disabled={noteSaving || taskForm.title.trim().length < 3} className="rounded-xl bg-[#b8f43d] px-4 py-2.5 text-xs font-black text-[#10150f] disabled:opacity-40">{noteSaving ? 'Creating…' : 'Create task'}</button></div></section><Directory title="Operational tasks" subtitle={`${detail.supportTasks.filter((task) => task.status !== 'completed').length} tasks currently open.`} empty="No support tasks created.">{detail.supportTasks.map((task) => <EventCard key={task.id} title={task.title} meta={`${formatRole(task.priority)} priority${task.due_at ? ` · due ${formatPortalDateTime(task.due_at)}` : ''}`} status={formatRole(task.status)} />)}</Directory><section className="rounded-[22px] border border-black/10 bg-white p-5"><h4 className="font-black">Add private platform note</h4><textarea value={supportNote} onChange={(event) => setSupportNote(event.target.value)} placeholder="Record a call, problem, decision, or follow-up…" rows={4} className="mt-3 w-full resize-none rounded-xl border border-black/10 bg-[#f5f7f2] p-3 text-sm font-semibold outline-none focus:border-[#7ca52b]" /><div className="mt-3 flex justify-end"><button type="button" onClick={() => void saveSupportNote()} disabled={noteSaving || supportNote.trim().length < 3} className="rounded-xl bg-[#152019] px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">{noteSaving ? 'Saving…' : 'Save private note'}</button></div></section><Directory title="Approval queue" subtitle="High-risk platform actions awaiting review." empty="No approval requests found.">{detail.approvals.map((approval) => <EventCard key={approval.id} title={formatRole(approval.action_type)} meta={`${formatRole(approval.entity_type)} · requested ${formatPortalDateTime(approval.created_at)}`} status={formatRole(approval.status)} />)}</Directory><Directory title="Private notes" subtitle="Internal operational context, stored in the immutable audit trail." empty="No private platform notes yet.">{detail.portalNotes.map((note) => <EventCard key={note.id} title={noteText(note.metadata)} meta={formatPortalDateTime(note.created_at)} status={actorName(note.metadata)} />)}</Directory><Directory title="Support tickets" subtitle={`${detail.supportTickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length} currently open.`} empty="No support tickets found.">{detail.supportTickets.map((ticket) => <EventCard key={ticket.id} title={`${ticket.ticket_number} · ${ticket.subject}`} meta={`${ticket.priority} priority · opened ${formatPortalDateTime(ticket.created_at)}`} status={formatRole(ticket.status)} />)}</Directory></div> : null}
        </> : null}
      </div>
    </aside>
  </div>
}

function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="rounded-[20px] border border-black/10 bg-white p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2e8] text-[#597338] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><p className="mt-4 text-[9px] font-black uppercase tracking-[0.14em] text-[#718078]">{label}</p><p className="mt-1 text-sm font-black capitalize">{value}</p></article>
}

function SectionHeading({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#152019] text-[#b8f43d] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><h3 className="text-xl font-black tracking-[-0.03em]">{title}</h3><p className="mt-1 text-sm text-[#718078]">{subtitle}</p></div></div>
}

function ReferenceCard({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#718078]">{label}</p><p className="mt-2 break-all font-mono text-xs font-bold">{value || 'Not connected'}</p></div>
}

function UsageCard({ icon, label, value, limit, percent, suffix = '' }: { icon: React.ReactNode; label: string; value: number; limit: number | null; percent: number; suffix?: string }) {
  const warning = limit !== null && percent >= 80
  return <article className="rounded-[20px] border border-black/10 bg-white p-4"><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2e8] text-[#597338] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span className={`text-[10px] font-black ${warning ? 'text-amber-700' : 'text-[#718078]'}`}>{limit === null ? 'UNLIMITED' : `${percent}%`}</span></div><p className="mt-4 text-[9px] font-black uppercase tracking-[0.14em] text-[#718078]">{label}</p><p className="mt-1 text-lg font-black">{value.toLocaleString()}{suffix} <span className="text-xs text-[#8a958e]">/ {limit === null ? '∞' : `${limit.toLocaleString()}${suffix}`}</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0eb]"><div className={`h-full rounded-full ${warning ? 'bg-amber-500' : 'bg-[#9ed52c]'}`} style={{ width: `${limit === null ? Math.min(20 + value, 100) : percent}%` }} /></div></article>
}

function EventCard({ title, meta, status }: { title: string; meta: string; status: string }) {
  return <article className="flex items-start justify-between gap-4 rounded-2xl border border-black/10 bg-white p-4"><div className="min-w-0"><p className="truncate text-sm font-black capitalize">{title}</p><p className="mt-1 text-[11px] font-semibold capitalize text-[#718078]">{meta}</p></div><span className="shrink-0 rounded-full bg-[#edf2e8] px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-[#506637]">{status}</span></article>
}

function CountCard({ value, label }: { value: number; label: string }) {
  return <article className="rounded-[18px] bg-[#152019] p-4 text-white"><p className="text-2xl font-black text-[#b8f43d]">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/45">{label}</p></article>
}

function Directory({ title, subtitle, empty, children }: { title: string; subtitle: string; empty: string; children: React.ReactNode }) {
  const entries = Array.isArray(children) ? children : [children]
  return <section><div className="mb-4"><h3 className="text-xl font-black tracking-[-0.03em]">{title}</h3><p className="mt-1 text-sm text-[#718078]">{subtitle}</p></div><div className="space-y-3">{entries.length > 0 ? children : <p className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center text-sm font-bold text-[#718078]">{empty}</p>}</div></section>
}

function PersonCard({ person, owner = false, onToggle, onRoleChange }: { person: OrganizationUser; owner?: boolean; onToggle?: () => void; onRoleChange?: (role: string) => void }) {
  return <article className="mt-3 flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8efdf] text-sm font-black text-[#3b5322]">{person.full_name.charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{person.full_name}</p>{owner ? <span className="rounded-full bg-[#b8f43d] px-2 py-1 text-[8px] font-black uppercase tracking-wide">Owner</span> : null}<span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ${person.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{person.is_active ? 'Active' : 'Inactive'}</span></div><p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#718078]">{formatRole(person.role)} · created {formatPortalDate(person.created_at)}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#657269]">{person.email ? <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{person.email}</span> : null}{person.phone ? <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{person.phone}</span> : null}</div>{onToggle && onRoleChange ? <div className="mt-4 flex flex-wrap items-center gap-2"><select value={person.role} onChange={(event) => onRoleChange(event.target.value)} className="h-9 rounded-xl border border-black/10 bg-[#f5f7f2] px-2 text-xs font-black capitalize outline-none">{['admin', 'manager', 'hr_manager', 'hr', 'operation_manager', 'operation_team', 'guard'].map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}</select><button type="button" onClick={onToggle} className={`h-9 rounded-xl px-3 text-xs font-black ${person.is_active ? 'border border-red-200 bg-red-50 text-red-700' : 'bg-emerald-600 text-white'}`}>{person.is_active ? 'Deactivate access' : 'Reactivate access'}</button></div> : null}</div></article>
}

function StaffCard({ person }: { person: StaffAccount }) {
  return <article className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#152019] text-sm font-black text-[#b8f43d]">{person.full_name.charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{person.full_name}</p><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ${person.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{person.status}</span>{person.profile_id ? <span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-blue-700">Login enabled</span> : null}</div><p className="mt-1 font-mono text-[10px] font-bold text-[#718078]">{person.employee_code} · {formatRole(person.staff_type || 'staff')} · added {formatPortalDate(person.created_at)}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#657269]">{person.email ? <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{person.email}</span> : <span>No email recorded</span>}{person.phone ? <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{person.phone}</span> : null}</div></div></article>
}

function DrawerSkeleton() {
  return <div className="space-y-4"><div className="h-24 animate-pulse rounded-[22px] bg-black/10" /><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-[20px] bg-black/10" />)}</div><div className="h-52 animate-pulse rounded-[22px] bg-black/10" /></div>
}

function Capacity({ value, limit, percent, label }: { value: number; limit: number | null; percent: number; label: string }) {
  const warning = limit !== null && percent >= 85
  return <div className="w-28"><p className="text-xs font-black">{value} / {limit === null ? '∞' : limit}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${warning ? 'bg-amber-500' : 'bg-[#9ed52c]'}`} style={{ width: `${limit === null ? Math.min(20 + value, 100) : percent}%` }} /></div><p className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${warning ? 'text-amber-700' : 'text-slate-400'}`}>{warning ? 'Near limit' : label}</p></div>
}

function Metric({ title, value, detail, icon, tone = 'dark' }: { title: string; value: string; detail: string; icon: React.ReactNode; tone?: 'dark' | 'lime' }) {
  const lime = tone === 'lime'
  return <article className={`rounded-[22px] border p-5 ${lime ? 'border-[#b8f43d]/40 bg-[#b8f43d] text-[#10150f]' : 'border-white/10 bg-[#121c18]'}`}><div className="flex items-start justify-between gap-4"><div><p className={`text-[10px] font-black uppercase tracking-[0.14em] ${lime ? 'opacity-55' : 'text-white/40'}`}>{title}</p><p className="mt-3 text-3xl font-black tracking-[-0.05em]">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5 ${lime ? 'bg-[#10150f] text-[#b8f43d]' : 'bg-white/5 text-[#b8f43d]'}`}>{icon}</span></div><p className={`mt-4 text-xs font-semibold ${lime ? 'opacity-60' : 'text-white/45'}`}>{detail}</p></article>
}

function Panel({ eyebrow, title, icon, children }: { eyebrow: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-white/10 bg-white p-5 text-[#152019]"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#718078]">{eyebrow}</p><h2 className="mt-1 text-lg font-black">{title}</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2e8] text-[#4e662f]">{icon}</span></div>{children}</section>
}

function PortalSkeleton() {
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-[22px] bg-white/10" />)}</div><div className="grid gap-5 xl:grid-cols-[1.55fr_0.45fr]"><div className="h-[520px] animate-pulse rounded-[26px] bg-white/10" /><div className="h-[520px] animate-pulse rounded-[26px] bg-white/10" /></div></div>
}

function utilization(value: number, limit: number | null) {
  if (!limit) return 0
  return Math.min(100, Math.round((value / limit) * 100))
}

function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatPortalDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatRole(value: string) {
  return value.replaceAll('_', ' ')
}

function actorName(metadata: Record<string, unknown>) {
  const value = metadata.actor_name
  return typeof value === 'string' && value ? value : 'System'
}

function noteText(metadata: Record<string, unknown>) {
  const value = metadata.note
  return typeof value === 'string' && value ? value : 'Private support note'
}

function organizationHealth(detail: OrganizationDetail) {
  let score = 100
  if (!['active', 'trialing'].includes(detail.organization.status)) score -= 35
  if (detail.subscription && !['active', 'trialing'].includes(detail.subscription.status)) score -= 20
  if (detail.usage.percentages.users >= 90 || detail.usage.percentages.staff >= 90) score -= 15
  if (detail.usage.percentages.storage >= 90) score -= 10
  const openCritical = detail.securityEvents.filter((event) => !event.reviewed_at && ['high', 'critical'].includes(event.severity)).length
  score -= Math.min(25, openCritical * 5)
  score = Math.max(0, score)
  if (score >= 85) return { score, label: 'Healthy', tone: 'text-[#b8f43d]' }
  if (score >= 65) return { score, label: 'Needs attention', tone: 'text-amber-300' }
  if (score >= 40) return { score, label: 'At risk', tone: 'text-orange-300' }
  return { score, label: 'Critical', tone: 'text-red-300' }
}

function isCancelledSubscription(status?: string | null) {
  return ['canceled', 'cancelled', 'incomplete_expired', 'inactive'].includes(status || '')
}
