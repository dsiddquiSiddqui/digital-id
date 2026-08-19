'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  LogOut,
  PauseCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  BILLING_PLANS,
  formatPlanLimit,
  getBillingPlan,
  type BillingPlanKey,
} from '@/lib/billing-plans'

type OrganizationRow = {
  id: string
  name: string
  slug: string
  status: string
  plan: BillingPlanKey
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
  const [metrics, setMetrics] = useState<Metrics>({
    organizations: 0,
    activeOrganizations: 0,
    suspendedOrganizations: 0,
    monthlyRevenue: 0,
    annualRevenue: 0,
    users: 0,
    staff: 0,
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
  })

  const loadPortal = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/portal/summary')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 403) router.replace('/portal/login')
        setError(result.error || 'Unable to load portal.')
        return
      }

      setOrganizations(result.organizations || [])
      setPortalUsers(result.portalUsers || [])
      setMetrics(result.metrics)
    } catch {
      setError('Something went wrong while loading the portal.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void Promise.resolve().then(loadPortal)
  }, [loadPortal])

  const updateOrganization = async (
    organization: OrganizationRow,
    updates: Partial<Pick<OrganizationRow, 'status' | 'plan'>>
  ) => {
    setSavingId(organization.id)
    setMessage('')
    setError('')

    const nextStatus = updates.status || organization.status
    const nextPlan = updates.plan || organization.plan

    try {
      const response = await fetch('/api/platform/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organization.id,
          status: nextStatus,
          plan: nextPlan,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to update organization.')
        return
      }

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
      const response = await fetch('/api/portal/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to create portal user.')
        return
      }

      setPortalUsers((prev) => [result.profile, ...prev])
      setUserForm({ full_name: '', email: '', password: '' })
      setMessage('Portal user created.')
    } catch {
      setError('Something went wrong while creating portal user.')
    } finally {
      setCreatingUser(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white lg:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Platform Portal
              </p>
              <h1 className="mt-1 text-2xl font-black">SaaS Command Center</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </header>

        {loading ? (
          <section className="rounded-[28px] border border-white/10 bg-white p-6 text-slate-950">
            <p className="text-sm text-slate-500">Loading portal...</p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Metric title="Monthly revenue" value={`£${metrics.monthlyRevenue.toLocaleString()}`} icon={<BadgeDollarSign className="h-5 w-5" />} />
              <Metric title="Annual revenue" value={`£${metrics.annualRevenue.toLocaleString()}`} icon={<BadgeDollarSign className="h-5 w-5" />} />
              <Metric title="Organizations" value={metrics.organizations.toLocaleString()} icon={<Building2 className="h-5 w-5" />} />
              <Metric title="Total users" value={metrics.users.toLocaleString()} icon={<Users className="h-5 w-5" />} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white text-slate-950">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="text-lg font-black">Organizations and billing</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Active plans currently generate £{metrics.monthlyRevenue.toLocaleString()} monthly.
                  </p>
                </div>

                {error ? (
                  <p className="m-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="m-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {message}
                  </p>
                ) : null}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px]">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-sm font-bold text-slate-500">
                        <th className="px-6 py-4">Organization</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Package</th>
                        <th className="px-6 py-4">Revenue</th>
                        <th className="px-6 py-4">Usage</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizations.map((organization) => {
                        const plan = getBillingPlan(organization.plan)
                        return (
                          <tr key={organization.id} className="border-b border-slate-200 last:border-b-0">
                            <td className="px-6 py-4">
                              <p className="font-black">{organization.name}</p>
                              <p className="mt-1 text-xs font-bold text-slate-400">
                                /{organization.slug}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={organization.status}
                                disabled={savingId === organization.id}
                                onChange={(event) =>
                                  updateOrganization(organization, {
                                    status: event.target.value,
                                  })
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold capitalize outline-none"
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={organization.plan}
                                disabled={savingId === organization.id}
                                onChange={(event) =>
                                  updateOrganization(organization, {
                                    plan: event.target.value as BillingPlanKey,
                                  })
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                              >
                                {BILLING_PLANS.map((billingPlan) => (
                                  <option key={billingPlan.key} value={billingPlan.key}>
                                    {billingPlan.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 text-sm font-black">
                              {plan.monthlyPrice === null ? 'Custom' : `£${plan.monthlyPrice}/mo`}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                              <p>{organization.user_count} / {formatPlanLimit(plan.userLimit, 'users')}</p>
                              <p className="mt-1">{organization.staff_count} / {formatPlanLimit(plan.staffLimit, 'staff')}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {organization.status === 'suspended' ? (
                                <button
                                  type="button"
                                  disabled={savingId === organization.id}
                                  onClick={() =>
                                    updateOrganization(organization, { status: 'active' })
                                  }
                                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={savingId === organization.id}
                                  onClick={() =>
                                    updateOrganization(organization, { status: 'suspended' })
                                  }
                                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                  Deactivate
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-white/10 bg-white p-6 text-slate-950">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3">
                      <Plus className="h-5 w-5 text-slate-700" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">Create portal user</h2>
                      <p className="text-sm text-slate-500">Creates another platform user.</p>
                    </div>
                  </div>

                  <form onSubmit={createPortalUser} className="space-y-3">
                    <input
                      value={userForm.full_name}
                      onChange={(event) =>
                        setUserForm((prev) => ({ ...prev, full_name: event.target.value }))
                      }
                      placeholder="Full name"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                      required
                    />
                    <input
                      value={userForm.email}
                      onChange={(event) =>
                        setUserForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="Email"
                      type="email"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                      required
                    />
                    <input
                      value={userForm.password}
                      onChange={(event) =>
                        setUserForm((prev) => ({ ...prev, password: event.target.value }))
                      }
                      placeholder="Password"
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                      required
                    />
                    <button
                      disabled={creatingUser}
                      className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {creatingUser ? 'Creating...' : 'Create portal user'}
                    </button>
                  </form>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white p-6 text-slate-950">
                  <h2 className="text-lg font-black">Portal users</h2>
                  <div className="mt-4 space-y-3">
                    {portalUsers.map((user) => (
                      <div key={user.id} className="rounded-2xl bg-slate-50 p-4">
                        <p className="font-black">{user.full_name}</p>
                        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white/10 p-6">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-300" />
                    <p className="text-sm font-bold text-white/75">
                      Portal users are stored as super admins and are not attached
                      to any tenant organization.
                    </p>
                  </div>
                </section>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Metric({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white p-5 text-slate-950 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  )
}
