'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  LogIn,
  PauseCircle,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react'
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
  user_count: number
  staff_count: number
  created_at: string
}

const STATUS_OPTIONS = ['active', 'trialing', 'paused', 'suspended', 'archived']

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [enteringId, setEnteringId] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadOrganizations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/platform/organizations')
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to load organizations.')
        return
      }

      setOrganizations(result.organizations || [])
    } catch {
      setError('Something went wrong while loading organizations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return organizations

    return organizations.filter((organization) => {
      return (
        organization.name.toLowerCase().includes(query) ||
        organization.slug.toLowerCase().includes(query) ||
        organization.status.toLowerCase().includes(query) ||
        organization.plan.toLowerCase().includes(query)
      )
    })
  }, [organizations, search])

  const totals = useMemo(() => {
    return {
      organizations: organizations.length,
      active: organizations.filter((org) => org.status === 'active').length,
      suspended: organizations.filter((org) => org.status === 'suspended').length,
      users: organizations.reduce((sum, org) => sum + org.user_count, 0),
    }
  }, [organizations])

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

      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === organization.id
            ? { ...org, status: nextStatus, plan: nextPlan }
            : org
        )
      )
      setMessage(`${organization.name} updated.`)
    } catch {
      setError('Something went wrong while updating organization.')
    } finally {
      setSavingId('')
    }
  }

  const enterOrganization = async (organization: OrganizationRow) => {
    const reason = window.prompt(`Reason for entering ${organization.name}?`)

    if (!reason || reason.trim().length < 8) {
      setError('A reason of at least 8 characters is required to enter an organization.')
      return
    }

    setEnteringId(organization.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/platform/organizations/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organization.id, reason }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to enter organization.')
        return
      }

      window.location.href = result.redirect_to || '/dashboard'
    } catch {
      setError('Something went wrong while entering the organization.')
    } finally {
      setEnteringId('')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Building2 className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                Platform Organizations
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Manage every tenant, deactivate organizations, and assign billing
                packages from one platform console.
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search organizations..."
              className="min-w-[240px] bg-transparent px-3 text-sm outline-none"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Organizations" value={totals.organizations} icon={<Building2 className="h-5 w-5" />} />
        <MetricCard title="Active" value={totals.active} icon={<CheckCircle2 className="h-5 w-5" />} />
        <MetricCard title="Suspended" value={totals.suspended} icon={<PauseCircle className="h-5 w-5" />} />
        <MetricCard title="Users" value={totals.users} icon={<Users className="h-5 w-5" />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        {BILLING_PLANS.map((plan) => (
          <article key={plan.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-black text-slate-950">{plan.name}</h2>
            </div>
            <p className="mt-2 text-2xl font-black">
              {plan.monthlyPrice === null ? 'Custom' : `£${plan.monthlyPrice}`}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {formatPlanLimit(plan.userLimit, 'users')}
            </p>
          </article>
        ))}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-slate-950">Organizations</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredOrganizations.length} result{filteredOrganizations.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-sm font-bold text-slate-600">
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Limits</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-slate-500">
                    Loading organizations...
                  </td>
                </tr>
              ) : filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-slate-500">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((organization) => {
                  const plan = getBillingPlan(organization.plan)
                  const overUserLimit =
                    plan.userLimit !== null && organization.user_count > plan.userLimit
                  const overStaffLimit =
                    plan.staffLimit !== null && organization.staff_count > plan.staffLimit

                  return (
                    <tr key={organization.id} className="border-b border-slate-200 last:border-b-0">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-950">{organization.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
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
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm font-semibold text-slate-700">
                          <p className={overUserLimit ? 'text-red-600' : ''}>
                            {organization.user_count.toLocaleString()} users
                          </p>
                          <p className={overStaffLimit ? 'text-red-600' : ''}>
                            {organization.staff_count.toLocaleString()} staff
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <p>{formatPlanLimit(plan.userLimit, 'users')}</p>
                        <p className="mt-1">{formatPlanLimit(plan.staffLimit, 'staff')}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={enteringId === organization.id}
                            onClick={() => enterOrganization(organization)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            <LogIn className="h-4 w-4" />
                            {enteringId === organization.id ? 'Opening...' : 'Enter'}
                          </button>

                          {organization.status === 'suspended' ? (
                            <button
                              type="button"
                              disabled={savingId === organization.id}
                              onClick={() =>
                                updateOrganization(organization, { status: 'active' })
                              }
                              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
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
                              <ShieldAlert className="h-4 w-4" />
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}
