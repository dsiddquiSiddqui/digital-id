'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CheckCircle2, LifeBuoy, MessageSquare, Send, ShieldCheck, Wand2 } from 'lucide-react'

type Ticket = {
  id: string
  ticket_number: number
  subject: string
  category: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'
  message: string
  response_summary: string | null
  created_at: string
}

const docs = [
  {
    title: 'First workspace setup',
    icon: <Wand2 className="h-5 w-5" />,
    href: '/setup-wizard',
    steps: ['Upload logo, favicon, and background', 'Choose the right package', 'Invite your admin team', 'Add staff and issue the first ID'],
  },
  {
    title: 'Daily operations',
    icon: <CheckCircle2 className="h-5 w-5" />,
    href: '/v2/staff',
    steps: ['Review alerts and expiry warnings', 'Renew staff documents', 'Use bulk actions for repeated updates', 'Export reports for management'],
  },
  {
    title: 'Security and reliability',
    icon: <ShieldCheck className="h-5 w-5" />,
    href: '/security-center',
    steps: ['Enable 2FA before launch', 'Review permissions by role', 'Check audit logs after sensitive changes', 'Use production readiness for final signoff'],
  },
]

const categories = ['general', 'billing', 'staff', 'id_cards', 'domains', 'security']
const priorities = ['normal', 'high', 'urgent', 'low']

export default function HelpPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    subject: '',
    category: 'general',
    priority: 'normal',
    message: '',
  })

  const loadTickets = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/support-tickets')
    const result = await response.json().catch(() => ({}))
    if (response.ok) setTickets(result.tickets || [])
    else setError(result.error || 'Unable to load support tickets.')
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(loadTickets)
  }, [])

  const openTickets = useMemo(() => tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length, [tickets])

  const submitTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Unable to create support ticket.')
    } else {
      setMessage(`Ticket #${result.ticket.ticket_number} created.`)
      setForm({ subject: '', category: 'general', priority: 'normal', message: '' })
      await loadTickets()
    }
    setSaving(false)
  }

  const closeTicket = async (id: string) => {
    await fetch('/api/admin/support-tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'resolved' }),
    })
    await loadTickets()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Documentation & Support</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Learn the core workflows, then raise a ticket when something needs platform review.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Open tickets</p>
            <p className="mt-1 text-3xl font-black">{openTickets}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {docs.map((doc) => (
          <article key={doc.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-slate-100 p-3 text-slate-700">{doc.icon}</span>
              <h2 className="font-black text-slate-950">{doc.title}</h2>
            </div>
            <ol className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              {doc.steps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-black text-slate-400">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Link href={doc.href} className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
              <BookOpen className="h-4 w-4" />
              Open workflow
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <form id="support-ticket" onSubmit={submitTicket} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm scroll-mt-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">Create support ticket</h2>
              <p className="mt-1 text-sm text-slate-500">Send issues, setup questions, and reliability checks to the platform team.</p>
            </div>
          </div>

          {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

          <div className="mt-5 space-y-4">
            <Field label="Subject" value={form.subject} onChange={(value) => setForm((prev) => ({ ...prev, subject: value }))} placeholder="Example: Custom domain is not verifying" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" value={form.category} options={categories} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} />
              <Select label="Priority" value={form.priority} options={priorities} onChange={(value) => setForm((prev) => ({ ...prev, priority: value }))} />
            </div>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Issue details</span>
              <textarea
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                rows={6}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="What happened, which page, and what did you expect?"
              />
            </label>
          </div>

          <button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" />
            {saving ? 'Creating ticket...' : 'Create ticket'}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-950">Recent tickets</h2>
            <button onClick={loadTickets} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No support tickets yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">#{ticket.ticket_number} - {ticket.category}</p>
                      <h3 className="mt-1 font-black text-slate-950">{ticket.subject}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{ticket.message}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : ticket.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500'}`}>
                        {ticket.priority}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">{ticket.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  {!['resolved', 'closed'].includes(ticket.status) ? (
                    <button onClick={() => closeTicket(ticket.id)} className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600">
                      Mark resolved
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400" placeholder={placeholder} />
    </label>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm capitalize outline-none transition focus:border-slate-400">
        {options.map((option) => (
          <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </label>
  )
}
