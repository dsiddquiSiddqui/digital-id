'use client'

import { useEffect, useState } from 'react'
import { Bell, Save } from 'lucide-react'

type Preferences = Record<'document_expiry' | 'document_renewals' | 'security_alerts' | 'billing_updates' | 'workspace_activity', boolean>

const options: Array<{ key: keyof Preferences; title: string; description: string }> = [
  { key: 'document_expiry', title: 'Document expiry', description: 'Expiring and overdue staff documents.' },
  { key: 'document_renewals', title: 'Renewal reviews', description: 'New document renewal requests awaiting review.' },
  { key: 'security_alerts', title: 'Security alerts', description: 'Suspicious activity, access, and rate-limit events.' },
  { key: 'billing_updates', title: 'Billing updates', description: 'Subscription, payment, and renewal changes.' },
  { key: 'workspace_activity', title: 'Workspace activity', description: 'Invitations, exports, and important workspace events.' },
]

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { void fetch('/api/admin/notification-preferences').then((response) => response.json()).then((data) => setPreferences(data.preferences || null)) }, [])

  const save = async () => {
    if (!preferences) return
    setSaving(true)
    const response = await fetch('/api/admin/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences }) })
    setMessage(response.ok ? 'Notification preferences saved.' : 'Unable to save preferences.')
    setSaving(false)
  }

  if (!preferences) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading notification preferences...</div>
  return <div className="mx-auto max-w-4xl space-y-6 pb-10">
    <section className="rounded-[2rem] bg-[#12251f] p-7 text-white sm:p-9"><Bell className="h-6 w-6 text-emerald-300" /><p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">Workspace controls</p><h1 className="mt-2 text-3xl font-black tracking-tight">Notification preferences</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Choose the operational updates that matter to your workspace. Essential security records remain available in the audit log.</p></section>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{options.map((option) => <button key={option.key} type="button" onClick={() => setPreferences((current) => current ? { ...current, [option.key]: !current[option.key] } : current)} className="flex w-full items-center justify-between gap-5 border-b border-slate-100 p-5 text-left last:border-0 hover:bg-slate-50"><span><span className="block font-black text-slate-950">{option.title}</span><span className="mt-1 block text-sm text-slate-500">{option.description}</span></span><span className={`h-7 w-12 rounded-full p-1 transition ${preferences[option.key] ? 'bg-emerald-600' : 'bg-slate-200'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${preferences[option.key] ? 'translate-x-5' : ''}`} /></span></button>)}</section>
    {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}
    <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save preferences'}</button>
  </div>
}
