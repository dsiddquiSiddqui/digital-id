'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Mail, Phone, Send, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL || 'support@gohaych.co.uk'
const salesPhone = process.env.NEXT_PUBLIC_SALES_PHONE || '0208 194 8009'
const REQUIREMENTS = ['Custom roles & permissions', 'Multi-site management', 'Priority onboarding', 'API or integrations', 'Custom branding', 'SLA & priority support']

type Identity = {
  company: string
  organizationId: string
  name: string
  email: string
  plan: string
}

export default function ContactSalesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [loadingIdentity, setLoadingIdentity] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ticketNumber, setTicketNumber] = useState<number | null>(null)
  const [form, setForm] = useState({ phone: '', requestedUsers: '', requestedStaff: '', timeline: '', message: '', requirements: [] as string[] })

  useEffect(() => {
    const loadIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in again to load your organisation details.')
        setLoadingIdentity(false)
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name,email,phone,organization_id,organizations(name,plan)')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError || !data?.organization_id) {
        setError('Unable to load your organisation details.')
        setLoadingIdentity(false)
        return
      }

      const organization = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations
      setIdentity({
        company: organization?.name || 'Organisation',
        organizationId: data.organization_id,
        name: data.full_name || 'Account owner',
        email: data.email || user.email || '',
        plan: organization?.plan || 'free',
      })
      setForm((current) => ({ ...current, phone: data.phone || '' }))
      setLoadingIdentity(false)
    }

    void loadIdentity()
  }, [supabase])

  const update = (key: 'phone' | 'requestedUsers' | 'requestedStaff' | 'timeline' | 'message', value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleRequirement = (requirement: string) => {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.includes(requirement)
        ? current.requirements.filter((item) => item !== requirement)
        : [...current.requirements, requirement],
    }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!identity) return

    const requestedUsers = Number(form.requestedUsers)
    const requestedStaff = Number(form.requestedStaff)
    if (!Number.isInteger(requestedUsers) || requestedUsers < 1 || !Number.isInteger(requestedStaff) || requestedStaff < 1) {
      setError('Enter valid user and staff requirements greater than zero.')
      return
    }

    setSaving(true)
    setError('')
    const response = await fetch('/api/admin/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: `Enterprise capacity request — ${identity.company}`,
        category: 'billing',
        priority: 'high',
        message: [
          `Company: ${identity.company}`,
          `Organization ID: ${identity.organizationId}`,
          `Current plan: ${identity.plan}`,
          `Requester: ${identity.name}`,
          `Email: ${identity.email}`,
          `Phone: ${form.phone || 'Not provided'}`,
          `Required system users: ${requestedUsers}`,
          `Required staff capacity: ${requestedStaff}`,
          `Target timeline: ${form.timeline || 'Not specified'}`,
          `Additional requirements: ${form.requirements.length ? form.requirements.join(', ') : 'None selected'}`,
          '',
          'Additional details:',
          form.message || 'No additional details provided.',
        ].join('\n'),
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (response.ok) setTicketNumber(result.ticket.ticket_number)
    else setError(result.error || 'Unable to send your enquiry.')
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/billing" className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="relative overflow-hidden border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
            <p className="relative text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Enterprise desk</p>
            <h1 className="relative mt-4 text-4xl font-black tracking-tight">Plan around your real operation.</h1>
            <p className="relative mt-4 text-sm leading-7 text-slate-300">Tell us the capacity and controls you need. Your account and organisation details are attached automatically, so the sales team can prepare a relevant proposal.</p>

            <div className="relative mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <div className="flex items-center gap-2 text-emerald-200"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.16em]">Verified workspace</span></div>
              {loadingIdentity ? <p className="mt-3 text-sm text-slate-300">Loading account details…</p> : identity ? (
                <div className="mt-4 space-y-3 text-sm">
                  <IdentityRow label="Company" value={identity.company} />
                  <IdentityRow label="Organisation ID" value={identity.organizationId} mono />
                  <IdentityRow label="Requester" value={identity.name} />
                  <IdentityRow label="Work email" value={identity.email} />
                  <IdentityRow label="Current plan" value={identity.plan.replace(/_/g, ' ')} />
                </div>
              ) : null}
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <a href={`mailto:${salesEmail}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"><Mail className="h-5 w-5 text-emerald-300" /><span><span className="block text-xs text-slate-400">Email</span><span className="font-bold">{salesEmail}</span></span></a>
              <a href={`tel:${salesPhone.replace(/\s/g, '')}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"><Phone className="h-5 w-5 text-emerald-300" /><span><span className="block text-xs text-slate-400">Phone</span><span className="font-bold">{salesPhone}</span></span></a>
            </div>
          </aside>

          <div className="bg-white p-8 text-slate-950 lg:p-10">
            {ticketNumber ? (
              <div className="flex min-h-[36rem] flex-col items-center justify-center text-center"><CheckCircle2 className="h-14 w-14 text-emerald-500" /><h2 className="mt-5 text-3xl font-black">Capacity brief received</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Your reference is #{ticketNumber}. The sales team now has your verified organisation details and requested capacity.</p><Link href="/billing" className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Return to billing</Link></div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-center gap-3"><span className="rounded-2xl bg-slate-100 p-3"><Users className="h-5 w-5" /></span><div><h2 className="text-2xl font-black">Capacity request</h2><p className="text-sm text-slate-500">Define the size and capabilities of your next package.</p></div></div>
                {error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <Field label="System users required" type="number" min="1" value={form.requestedUsers} onChange={(value) => update('requestedUsers', value)} placeholder="e.g. 120" required hint="Admins, HR and operations accounts" />
                  <Field label="Staff capacity required" type="number" min="1" value={form.requestedStaff} onChange={(value) => update('requestedStaff', value)} placeholder="e.g. 8,000" required hint="Staff records, not system logins" />
                  <Field label="Phone number" type="tel" value={form.phone} onChange={(value) => update('phone', value)} placeholder="Optional contact number" />
                  <label><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Target timeline</span><select value={form.timeline} onChange={(event) => update('timeline', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"><option value="">Select a timeline</option><option>Immediately</option><option>Within 30 days</option><option>1–3 months</option><option>3–6 months</option><option>Planning stage</option></select></label>
                </div>

                <fieldset className="mt-6"><legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">What else do you need?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{REQUIREMENTS.map((requirement) => { const selected = form.requirements.includes(requirement); return <button key={requirement} type="button" aria-pressed={selected} onClick={() => toggleRequirement(requirement)} className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{selected ? '✓ ' : '+ '}{requirement}</button> })}</div></fieldset>

                <label className="mt-6 block"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Additional details</span><textarea rows={5} value={form.message} onChange={(event) => update('message', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500" placeholder="Tell us about locations, compliance needs, integrations, onboarding, or procurement requirements." /></label>
                <button disabled={saving || loadingIdentity || !identity} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white disabled:opacity-60"><Send className="h-4 w-4" />{saving ? 'Sending…' : loadingIdentity ? 'Loading account…' : 'Send capacity request'}</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function IdentityRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-emerald-200/60">{label}</p><p className={`mt-0.5 break-all font-bold text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</p></div>
}

function Field({ label, value, onChange, type = 'text', min, required = false, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; required?: boolean; placeholder?: string; hint?: string }) {
  return <label><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span><input required={required} min={min} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500" />{hint ? <span className="mt-1.5 block text-xs text-slate-400">{hint}</span> : null}</label>
}
