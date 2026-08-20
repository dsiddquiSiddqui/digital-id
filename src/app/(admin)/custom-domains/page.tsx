'use client'

import { useEffect, useState } from 'react'
import { Globe2, Plus, RefreshCw } from 'lucide-react'

type DomainRow = {
  id: string
  domain: string
  status: string
  purpose: string
  verification_token: string
  dns_target: string
  dns_status?: string
  ssl_status?: string
  cname_ok?: boolean
  txt_ok?: boolean
  last_checked_at?: string | null
  last_error?: string | null
  created_at: string
}

export default function CustomDomainsPage() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [form, setForm] = useState({ domain: '', purpose: 'login' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingId, setCheckingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/custom-domains')
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to load domains.')
    else setDomains(result.domains || [])
    setLoading(false)
  }

  const verify = async (id: string) => {
    setCheckingId(id)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/custom-domains', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'verify' }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Unable to verify DNS records.')
    } else {
      setMessage(result.check?.verified ? 'Domain DNS verified. SSL can now be provisioned.' : result.check?.error || 'DNS records are not ready yet.')
      await load()
    }
    setCheckingId('')
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/custom-domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to add domain.')
    else {
      setMessage('Domain added. Add the DNS records below before verification.')
      setForm({ domain: '', purpose: 'login' })
      await load()
    }
    setSaving(false)
  }

  if (loading) return <Panel>Loading domains...</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Globe2 className="h-5 w-5" /></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Custom Domains</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Prepare branded login or verification domains for each tenant.</p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_220px_auto]">
        <input value={form.domain} onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))} placeholder="ids.example.com" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
        <select value={form.purpose} onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none">
          <option value="login">Login</option>
          <option value="verification">Verification</option>
          <option value="both">Both</option>
        </select>
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {error ? <Panel tone="danger">{error}</Panel> : null}
      {message ? <Panel tone="success">{message}</Panel> : null}

      <section className="grid gap-4">
        {domains.length === 0 ? <Panel>No custom domains yet.</Panel> : domains.map((domain) => (
          <article key={domain.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">{domain.domain}</h2>
                <p className="mt-1 text-sm font-bold capitalize text-slate-500">{domain.purpose} - {domain.status}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${domain.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : domain.dns_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {domain.status === 'verified' ? 'verified' : domain.dns_status || domain.status}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <DnsBox label="CNAME" value={`${domain.domain} -> ${domain.dns_target}`} ok={domain.cname_ok} />
              <DnsBox label="TXT verification" value={`digital-id-x-verification=${domain.verification_token}`} ok={domain.txt_ok} />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-semibold text-slate-500">
                {domain.last_checked_at ? `Last checked ${new Date(domain.last_checked_at).toLocaleString()}` : 'Not checked yet'}
                {domain.last_error ? <span className="mt-1 block text-red-600">{domain.last_error}</span> : null}
              </div>
              <button onClick={() => verify(domain.id)} disabled={checkingId === domain.id} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-60">
                <RefreshCw className={`h-3.5 w-3.5 ${checkingId === domain.id ? 'animate-spin' : ''}`} />
                {checkingId === domain.id ? 'Checking...' : 'Verify DNS'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function DnsBox({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-400"><span>{label}</span><span className={ok ? 'text-emerald-600' : 'text-slate-400'}>{ok ? 'OK' : 'Pending'}</span></p><p className="mt-2 break-all text-sm font-bold text-slate-700">{value}</p></div>
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>{children}</div>
}
