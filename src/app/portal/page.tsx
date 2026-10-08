'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  LogOut,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserRoundCog,
  Users,
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
  monthlyRevenue: number
  annualRevenue: number
  users: number
  staff: number
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
  const [metrics, setMetrics] = useState<Metrics>({ organizations: 0, activeOrganizations: 0, suspendedOrganizations: 0, monthlyRevenue: 0, annualRevenue: 0, users: 0, staff: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '' })

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

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return organizations.filter((organization) => {
      const matchesQuery = !query || [organization.name, organization.slug, organization.id, organization.plan].some((value) => value.toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'all' || organization.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [organizations, search, statusFilter])

  const planMix = useMemo(() => BILLING_PLANS.map((plan) => ({ ...plan, count: organizations.filter((organization) => organization.plan === plan.key).length })).filter((plan) => plan.count > 0), [organizations])
  const attentionOrganizations = useMemo(() => organizations.filter((organization) => organization.status === 'suspended' || organization.status === 'paused' || utilization(organization.staff_count, organization.staff_limit) >= 85), [organizations])
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
            <Metric title="Organizations" value={metrics.organizations.toLocaleString()} detail={`${metrics.activeOrganizations} active · ${metrics.suspendedOrganizations} suspended`} icon={<Building2 />} />
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
                  <thead className="bg-[#edf0eb]"><tr className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#68766e]"><th className="px-5 py-3.5">Organization</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Package</th><th className="px-5 py-3.5">Monthly</th><th className="px-5 py-3.5">Seat capacity</th><th className="px-5 py-3.5">Staff capacity</th><th className="px-5 py-3.5 text-right">Control</th></tr></thead>
                  <tbody>{filteredOrganizations.map((organization) => <OrganizationRowView key={organization.id} organization={organization} saving={savingId === organization.id} onUpdate={updateOrganization} />)}</tbody>
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
                <div className="space-y-2">{attentionOrganizations.slice(0, 5).map((organization) => <div key={organization.id} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-black">{organization.name}</p><p className="mt-0.5 text-[11px] font-semibold text-amber-800">{organization.status === 'suspended' ? 'Access suspended' : organization.status === 'paused' ? 'Workspace paused' : `${utilization(organization.staff_count, organization.staff_limit)}% staff capacity`}</p></div><ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" /></div>)}{attentionOrganizations.length === 0 ? <p className="rounded-xl bg-emerald-50 px-3 py-4 text-sm font-bold text-emerald-800">No tenant intervention required.</p> : null}</div>
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
    </main>
  )
}

function OrganizationRowView({ organization, saving, onUpdate }: { organization: OrganizationRow; saving: boolean; onUpdate: (organization: OrganizationRow, updates: Partial<Pick<OrganizationRow, 'status' | 'plan'>>) => Promise<void> }) {
  const plan = getBillingPlan(organization.plan)
  const staffPercent = utilization(organization.staff_count, plan.staffLimit)
  const userPercent = utilization(organization.user_count, plan.userLimit)
  return <tr className="border-b border-black/10 bg-white transition hover:bg-[#fafbf8] last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8efdf] text-sm font-black text-[#3b5322]">{organization.name.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="max-w-52 truncate text-sm font-black">{organization.name}</p><p className="mt-1 max-w-52 truncate font-mono text-[10px] font-bold text-[#7a877f]">/{organization.slug}</p></div></div></td><td className="px-5 py-4"><select value={organization.status} disabled={saving} onChange={(event) => void onUpdate(organization, { status: event.target.value })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black capitalize outline-none disabled:opacity-50">{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></td><td className="px-5 py-4"><select value={organization.plan} disabled={saving} onChange={(event) => void onUpdate(organization, { plan: event.target.value as BillingPlanKey })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black outline-none disabled:opacity-50">{BILLING_PLANS.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></td><td className="px-5 py-4 text-sm font-black">{plan.monthlyPrice === null ? 'Custom' : `£${plan.monthlyPrice}`}</td><td className="px-5 py-4"><Capacity value={organization.user_count} limit={plan.userLimit} percent={userPercent} label="users" /></td><td className="px-5 py-4"><Capacity value={organization.staff_count} limit={plan.staffLimit} percent={staffPercent} label="staff" /></td><td className="px-5 py-4 text-right">{organization.status === 'suspended' ? <button disabled={saving} onClick={() => void onUpdate(organization, { status: 'active' })} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />Reactivate</button> : <button disabled={saving} onClick={() => void onUpdate(organization, { status: 'suspended' })} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-50"><PauseCircle className="h-3.5 w-3.5" />Suspend</button>}</td></tr>
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
