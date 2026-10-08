'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bell, RefreshCw, Save } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/notification-preferences', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.preferences) {
        throw new Error(data?.error || 'Unable to load notification preferences.')
      }
      setPreferences(data.preferences)
    } catch (loadError) {
      setPreferences(null)
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notification preferences.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    if (!preferences) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences }) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to save preferences.')
      setPreferences(data.preferences || preferences)
      setMessage('Notification preferences saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="rounded-3xl border border-[var(--dx-line)] bg-white p-6 text-sm text-[var(--dx-muted)]">Loading notification preferences...</div>
  if (!preferences) return <div className="rounded-3xl border border-red-200 bg-white p-6"><AlertTriangle className="h-6 w-6 text-red-600" /><p className="mt-3 text-sm font-bold text-[var(--dx-ink)]">Notification preferences could not be loaded</p><p className="mt-1 text-sm text-[var(--dx-muted)]">{error || 'Please try again.'}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--dx-signal)] px-4 py-2.5 text-sm font-black text-[var(--dx-on-signal)]"><RefreshCw className="h-4 w-4" />Retry</button></div>
  return <div className="mx-auto max-w-4xl space-y-6 pb-10">
    <section className="rounded-[2rem] bg-[#12251f] p-7 text-white sm:p-9"><Bell className="h-6 w-6 text-emerald-300" /><p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">Workspace controls</p><h1 className="mt-2 text-3xl font-black tracking-tight">Notification preferences</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Choose the operational updates that matter to your workspace. Essential security records remain available in the audit log.</p></section>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{options.map((option) => <button key={option.key} type="button" onClick={() => setPreferences((current) => current ? { ...current, [option.key]: !current[option.key] } : current)} className="flex w-full items-center justify-between gap-5 border-b border-slate-100 p-5 text-left last:border-0 hover:bg-slate-50"><span><span className="block font-black text-slate-950">{option.title}</span><span className="mt-1 block text-sm text-slate-500">{option.description}</span></span><span className={`h-7 w-12 rounded-full p-1 transition ${preferences[option.key] ? 'bg-emerald-600' : 'bg-slate-200'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${preferences[option.key] ? 'translate-x-5' : ''}`} /></span></button>)}</section>
    {message ? <p className="rounded-2xl bg-[var(--dx-signal-soft)] px-4 py-3 text-sm font-bold text-[var(--dx-ink)]">{message}</p> : null}
    {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
    <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save preferences'}</button>
  </div>
}
