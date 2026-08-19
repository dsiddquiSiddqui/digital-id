'use client'

import { useEffect, useState } from 'react'
import { HardDrive, Save, ShieldCheck } from 'lucide-react'

type SecurityData = {
  settings: {
    require_2fa: boolean
    device_tracking_enabled: boolean
    rate_limit_enabled: boolean
    session_history_enabled: boolean
    session_timeout_minutes: number
    ip_allowlist: string[]
    backup_policy: { frequency: string; retention_days: number }
    compliance_policy: {
      require_document_approval: boolean
      allow_staff_self_service: boolean
      allow_staff_id_download: boolean
    }
  }
  usage: {
    limits: { storageMb: number }
    usage: { devices: number; securityAlerts: number }
  }
  sessions: Array<{ id: string; device_name: string | null; ip_address: string | null; last_seen_at: string }>
  rate_limit_events: number
}

export default function SecurityCenterPage() {
  const [data, setData] = useState<SecurityData | null>(null)
  const [form, setForm] = useState({
    require_2fa: false,
    device_tracking_enabled: true,
    rate_limit_enabled: true,
    session_history_enabled: true,
    session_timeout_minutes: 480,
    ip_allowlist: '',
    backup_policy: { frequency: 'weekly', retention_days: 30 },
    compliance_policy: {
      require_document_approval: true,
      allow_staff_self_service: true,
      allow_staff_id_download: false,
    },
    storage_quota_mb: 1024,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/security-center')
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Unable to load security center.')
    } else {
      setData(result)
      setForm({
        require_2fa: result.settings.require_2fa,
        device_tracking_enabled: result.settings.device_tracking_enabled,
        rate_limit_enabled: result.settings.rate_limit_enabled,
        session_history_enabled: result.settings.session_history_enabled,
        session_timeout_minutes: result.settings.session_timeout_minutes,
        ip_allowlist: (result.settings.ip_allowlist || []).join('\n'),
        backup_policy: result.settings.backup_policy,
        compliance_policy: result.settings.compliance_policy,
        storage_quota_mb: result.usage.limits.storageMb,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/security-center', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ip_allowlist: form.ip_allowlist.split('\n').map((item) => item.trim()).filter(Boolean),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Unable to save settings.')
    } else {
      setMessage('Security settings saved.')
      await load()
    }
    setSaving(false)
  }

  if (loading) return <Panel>Loading security center...</Panel>
  if (error && !data) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Security Center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure reliability controls. 2FA requires Supabase MFA or another provider before it can be fully enforced.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Toggle label="Require 2FA" desc="Store the policy now; connect MFA enforcement before production rollout." value={form.require_2fa} onChange={(value) => setForm((prev) => ({ ...prev, require_2fa: value }))} />
        <Toggle label="Device login tracking" desc="Track trusted devices and session history for admin users." value={form.device_tracking_enabled} onChange={(value) => setForm((prev) => ({ ...prev, device_tracking_enabled: value }))} />
        <Toggle label="Rate limit monitoring" desc="Record throttling events for suspicious activity and abuse protection." value={form.rate_limit_enabled} onChange={(value) => setForm((prev) => ({ ...prev, rate_limit_enabled: value }))} />
        <Toggle label="Session history" desc="Keep recent login/device activity available for investigation." value={form.session_history_enabled} onChange={(value) => setForm((prev) => ({ ...prev, session_history_enabled: value }))} />
        <Toggle label="Require document approval" desc="New or renewed documents stay pending until an admin reviews them." value={form.compliance_policy.require_document_approval} onChange={(value) => setForm((prev) => ({ ...prev, compliance_policy: { ...prev.compliance_policy, require_document_approval: value } }))} />
        <Toggle label="Staff self-service" desc="Allow staff to upload renewals and request profile corrections." value={form.compliance_policy.allow_staff_self_service} onChange={(value) => setForm((prev) => ({ ...prev, compliance_policy: { ...prev.compliance_policy, allow_staff_self_service: value } }))} />
        <Toggle label="Staff ID downloads" desc="Allow staff to download their own digital ID when their profile is active." value={form.compliance_policy.allow_staff_id_download} onChange={(value) => setForm((prev) => ({ ...prev, compliance_policy: { ...prev.compliance_policy, allow_staff_id_download: value } }))} />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-slate-500" />
            <h2 className="font-black text-slate-950">Storage quota</h2>
          </div>
          <input
            type="number"
            min={1}
            value={form.storage_quota_mb}
            onChange={(event) => setForm((prev) => ({ ...prev, storage_quota_mb: Number(event.target.value) }))}
            className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-slate-950"
          />
          <p className="mt-2 text-xs text-slate-500">Quota is stored in MB for document/photo storage reporting.</p>
        </div>
        <NumberCard label="Session timeout" suffix="minutes" value={form.session_timeout_minutes} onChange={(value) => setForm((prev) => ({ ...prev, session_timeout_minutes: value }))} />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-slate-950">Backup policy</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={form.backup_policy.frequency} onChange={(event) => setForm((prev) => ({ ...prev, backup_policy: { ...prev.backup_policy, frequency: event.target.value } }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input type="number" min={7} value={form.backup_policy.retention_days} onChange={(event) => setForm((prev) => ({ ...prev, backup_policy: { ...prev.backup_policy, retention_days: Number(event.target.value) } }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none" />
          </div>
          <p className="mt-2 text-xs text-slate-500">Retention is stored in days for exports and backup procedures.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="font-black text-slate-950">IP allowlist</h2>
          <textarea value={form.ip_allowlist} onChange={(event) => setForm((prev) => ({ ...prev, ip_allowlist: event.target.value }))} rows={4} placeholder="One IP or CIDR per line" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
          <p className="mt-2 text-xs text-slate-500">Leave blank to allow all IPs. Enforcement can be connected in middleware before production launch.</p>
        </div>
      </section>

      {error ? <Panel tone="danger">{error}</Panel> : null}
      {message ? <Panel tone="success">{message}</Panel> : null}

      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save security settings'}
      </button>
    </div>
  )
}

function NumberCard({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-black text-slate-950">{label}</h2>
      <div className="mt-4 flex items-center rounded-2xl border border-slate-200 px-4 py-3">
        <input type="number" min={15} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full bg-transparent text-sm font-bold outline-none" />
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{suffix}</span>
      </div>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>{children}</div>
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-start justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
      <span>
        <span className="block font-black text-slate-950">{label}</span>
        <span className="mt-2 block text-sm leading-6 text-slate-500">{desc}</span>
      </span>
      <span className={`mt-1 h-7 w-12 rounded-full p-1 transition ${value ? 'bg-slate-950' : 'bg-slate-200'}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition ${value ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}
