'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, CheckCircle2, Mail, Phone, Send } from 'lucide-react'

const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL || 'support@gohaych.co.uk'
const salesPhone = process.env.NEXT_PUBLIC_SALES_PHONE || '0208 194 8009'

export default function ContactSalesPage() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ticketNumber, setTicketNumber] = useState<number | null>(null)
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', teamSize: '', message: '' })

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const response = await fetch('/api/admin/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: `Enterprise sales enquiry — ${form.company}`,
        category: 'billing',
        priority: 'high',
        message: [
          `Contact: ${form.name}`,
          `Email: ${form.email}`,
          `Phone: ${form.phone}`,
          `Team size: ${form.teamSize}`,
          '',
          form.message,
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
            <h1 className="relative mt-4 text-4xl font-black tracking-tight">Let’s design the right rollout.</h1>
            <p className="relative mt-4 text-sm leading-7 text-slate-300">
              Talk to us about custom staff volumes, admin seats, security controls, onboarding, and service-level requirements.
            </p>
            <div className="relative mt-8 space-y-3">
              <a href={`mailto:${salesEmail}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                <Mail className="h-5 w-5 text-emerald-300" />
                <span><span className="block text-xs text-slate-400">Email</span><span className="font-bold">{salesEmail}</span></span>
              </a>
              {salesPhone ? (
                <a href={`tel:${salesPhone.replace(/\s/g, '')}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                  <Phone className="h-5 w-5 text-emerald-300" />
                  <span><span className="block text-xs text-slate-400">Phone</span><span className="font-bold">{salesPhone}</span></span>
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Phone className="h-5 w-5 text-emerald-300" />
                  <span><span className="block text-xs text-slate-400">Phone</span><span className="font-bold">Number pending configuration</span></span>
                </div>
              )}
            </div>
          </aside>

          <div className="bg-white p-8 text-slate-950 lg:p-10">
            {ticketNumber ? (
              <div className="flex min-h-[30rem] flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                <h2 className="mt-5 text-3xl font-black">Enquiry received</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Your reference is #{ticketNumber}. Our sales team can now review your workspace and requirements.</p>
                <Link href="/billing" className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Return to billing</Link>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-slate-100 p-3"><Building2 className="h-5 w-5" /></span>
                  <div><h2 className="text-2xl font-black">Enterprise enquiry</h2><p className="text-sm text-slate-500">Tell us what your organisation needs.</p></div>
                </div>
                {error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <Field label="Company" value={form.company} onChange={(value) => update('company', value)} required />
                  <Field label="Your name" value={form.name} onChange={(value) => update('name', value)} required />
                  <Field label="Work email" type="email" value={form.email} onChange={(value) => update('email', value)} required />
                  <Field label="Phone number" type="tel" value={form.phone} onChange={(value) => update('phone', value)} required />
                  <Field label="Expected team size" value={form.teamSize} onChange={(value) => update('teamSize', value)} required />
                  <label className="sm:col-span-2"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Requirements</span><textarea required rows={5} value={form.message} onChange={(event) => update('message', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500" placeholder="Sites, staff volume, security controls, integrations, and target launch date" /></label>
                </div>
                <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white disabled:opacity-60"><Send className="h-4 w-4" />{saving ? 'Sending…' : 'Send enterprise enquiry'}</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500" /></label>
}
