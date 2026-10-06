'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeDollarSign, CalendarClock, CheckCircle2, ExternalLink, RefreshCw, Users, Shield, HardDrive } from 'lucide-react'
import { BILLING_PLANS, formatPlanLimit } from '@/lib/billing-plans'

type BillingData = {
  organization: { name: string; plan: string; status: string } | null
  plan: { key: string; name: string; monthlyPrice: number | null; description: string }
  usage: { users: number; staff: number; ids: number; documents: number; storageMb: number }
  limits: { users: number | null; staff: number | null; storageMb: number }
  percentages: { users: number; staff: number; storage: number }
  isOverLimit: { users: boolean; staff: boolean }
  subscription: { status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/billing')
        const result = await response.json()
        if (!response.ok) {
          setError(result.error || 'Unable to load billing.')
          return
        }
        setData(result)
      } catch {
        setError('Unable to load billing.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const startCheckout = async (plan: string) => {
    setActionLoading(plan)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const result = await response.json()
      if (!response.ok) setError(result.error || 'Unable to start checkout.')
      else if (result.checkout_url) window.location.href = result.checkout_url
      else setMessage(result.message || 'Billing provider setup is required.')
    } catch {
      setError('Unable to connect to checkout. Please try again.')
    } finally {
      setActionLoading('')
    }
  }

  const openPortal = async () => {
    setActionLoading('portal')
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/billing/portal', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) setError(result.error || 'Unable to open billing portal.')
      else if (result.portal_url) window.location.href = result.portal_url
      else setMessage(result.message || 'Payment portal setup is required.')
    } catch {
      setError('Unable to connect to the billing portal. Please try again.')
    } finally {
      setActionLoading('')
    }
  }

  const cancelSubscription = async () => {
    if (!window.confirm('Cancel this subscription at the end of the current billing period? Your workspace will return to Free after that date.')) return
    setActionLoading('cancel')
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/billing/cancel', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to cancel the subscription.')
      } else {
        setMessage(result.message)
        setData((current) => current?.subscription ? {
          ...current,
          subscription: {
            ...current.subscription,
            status: result.status,
            cancel_at_period_end: true,
            current_period_end: result.current_period_end,
          },
        } : current)
      }
    } catch {
      setError('Unable to cancel the subscription. Please try again.')
    } finally {
      setActionLoading('')
    }
  }

  const hasSubscription = Boolean(data?.subscription && !['cancelled', 'incomplete_expired'].includes(data.subscription.status))
  const renewalDate = data?.subscription?.current_period_end
    ? formatSubscriptionDate(data.subscription.current_period_end)
    : null

  if (loading) return <Panel>Loading billing...</Panel>
  if (!data) return null

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Billing
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {data.plan.name} package
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review usage and manage your subscription from one place. Existing
              subscribers can upgrade or downgrade securely in Stripe.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
              Monthly price
            </p>
            <p className="mt-1 text-2xl font-black">
              {data.plan.monthlyPrice === null ? 'Custom' : `GBP ${data.plan.monthlyPrice}`}
            </p>
            {data.plan.key === 'enterprise' ? (
              <Link
                href="/contact-sales"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Contact sales
              </Link>
            ) : data.plan.key === 'free' && !hasSubscription ? (
              <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white">
                Free forever · No card · No expiry
              </p>
            ) : (
              <button
                onClick={hasSubscription ? openPortal : () => startCheckout(data.plan.key)}
                disabled={actionLoading === 'portal' || actionLoading === data.plan.key}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-60"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {hasSubscription ? 'Manage subscription' : `Start ${data.plan.name}`}
              </button>
            )}
          </div>
        </div>
        {data.subscription ? (
          <div className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 ${data.subscription.cancel_at_period_end ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {data.subscription.cancel_at_period_end ? <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" /> : <RefreshCw className="mt-0.5 h-5 w-5 shrink-0" />}
            <div>
              <p className="text-sm font-black">
                {data.subscription.cancel_at_period_end
                  ? renewalDate ? `Subscription ends ${renewalDate}` : 'Cancellation scheduled'
                  : renewalDate ? `Next renewal: ${renewalDate}` : 'Next renewal date is being confirmed'}
              </p>
              <p className="mt-1 text-sm leading-5 opacity-75">
                {data.subscription.cancel_at_period_end
                  ? 'Access remains active until the end date. Open the Stripe portal to resume before then.'
                  : 'Subscriptions renew monthly. Open the Stripe portal to change packages, update payment details, or cancel at the end of the current billing period.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={openPortal} disabled={actionLoading === 'portal'} className="inline-flex items-center gap-2 rounded-xl border border-current/20 bg-white/70 px-3 py-2 text-xs font-black disabled:opacity-60"><ExternalLink className="h-3.5 w-3.5" />Manage payment</button>
                {!data.subscription.cancel_at_period_end ? (
                  <button onClick={cancelSubscription} disabled={actionLoading === 'cancel'} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60">{actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}</button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Users className="h-5 w-5" />} label="Users" value={data.usage.users} />
        <Metric icon={<Shield className="h-5 w-5" />} label="Staff" value={data.usage.staff} />
        <Metric icon={<HardDrive className="h-5 w-5" />} label="Documents" value={data.usage.documents} />
      </div>

      {message ? <Panel tone="success">{message}</Panel> : null}
      {error ? <Panel tone="danger">{error}</Panel> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <UsageBar
          label="User seats"
          value={data.usage.users}
          limit={data.limits.users}
          percent={data.percentages.users}
          over={data.isOverLimit.users}
        />
        <UsageBar
          label="Staff records"
          value={data.usage.staff}
          limit={data.limits.staff}
          percent={data.percentages.staff}
          over={data.isOverLimit.staff}
        />
        <UsageBar
          label="Storage"
          value={data.usage.storageMb}
          limit={data.limits.storageMb}
          percent={data.percentages.storage}
          over={data.usage.storageMb > data.limits.storageMb}
          suffix="MB"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <BadgeDollarSign className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-black text-slate-950">Packages</h2>
        </div>
        <p className="-mt-2 mb-5 text-sm leading-6 text-slate-500">
          Free never uses Stripe and never expires. Paid plans renew monthly until you cancel.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {BILLING_PLANS.map((plan) => {
            const isCurrent = plan.key === data.plan.key
            const isFree = plan.key === 'free'
            const isEnterprise = plan.key === 'enterprise'
            const usesPortal = hasSubscription && !isEnterprise && !isFree
            const isLocalFree = isCurrent && isFree && !hasSubscription
            const isCurrentPaidSubscription = isCurrent && !isFree && !isEnterprise && hasSubscription
            const actionLabel = isLocalFree
              ? 'Current plan · No expiry'
              : isCurrentPaidSubscription
              ? 'Cancel subscription'
              : isCurrent
              ? 'Current subscription'
              : isEnterprise
                ? 'Contact sales'
                : isFree && hasSubscription
                  ? 'Cancel paid plan to Free'
                  : usesPortal
                  ? `Change to ${plan.name}`
                  : `Start ${plan.name} — GBP ${plan.monthlyPrice}/mo`
            const action = (isFree && (hasSubscription || data.plan.key !== 'free')) || isCurrentPaidSubscription
              ? cancelSubscription
              : usesPortal
                ? openPortal
                : () => startCheckout(plan.key)

            return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-4 ${
                isCurrent
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black">{plan.name}</h3>
                {isCurrent ? <CheckCircle2 className="h-4 w-4" /> : null}
              </div>
              <p className="mt-2 text-sm opacity-70">{plan.description}</p>
              <p className="mt-4 text-xs font-bold opacity-70">
                {formatPlanLimit(plan.userLimit, 'users')}
                <br />
                {formatPlanLimit(plan.staffLimit, 'staff')}
              </p>
              {isEnterprise ? (
                <Link
                  href="/contact-sales"
                  className="mt-4 block w-full rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-black text-white"
                >
                  {actionLabel}
                </Link>
              ) : (
                <button
                  onClick={action}
                  disabled={isLocalFree || (isCurrent && !isCurrentPaidSubscription) || actionLoading === plan.key || ((isFree || isCurrentPaidSubscription) && actionLoading === 'cancel') || (usesPortal && !isCurrentPaidSubscription && actionLoading === 'portal')}
                  className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-black ${
                    isCurrentPaidSubscription
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : isCurrent
                      ? 'bg-white/15 text-current'
                      : 'bg-slate-950 text-white'
                  } disabled:opacity-60`}
                >
                  {actionLabel}
                </button>
              )}
            </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const styles =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-white text-slate-500'
  return (
    <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>
      {children}
    </div>
  )
}

function formatSubscriptionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'on the next billing date'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <span className="rounded-2xl bg-slate-100 p-3 text-slate-600">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{value.toLocaleString()}</p>
    </div>
  )
}

function UsageBar({ label, value, limit, percent, over, suffix = '' }: { label: string; value: number; limit: number | null; percent: number; over: boolean; suffix?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-950">{label}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${over ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {over ? 'Over limit' : 'Healthy'}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {value.toLocaleString()} {suffix} of {limit === null ? 'custom limit' : `${limit.toLocaleString()} ${suffix}`.trim()}
      </p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-slate-950'}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
