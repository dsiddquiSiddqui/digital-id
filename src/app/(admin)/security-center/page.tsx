'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Check, CheckCircle2, Clock3, DatabaseBackup,
  Fingerprint, Gauge, Globe2, HardDrive, KeyRound, Laptop, Loader2,
  LockKeyhole, RefreshCw, Save, ShieldCheck, ShieldHalf, Smartphone, UsersRound,
} from 'lucide-react'

type SecuritySettings = {
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

type SecurityData = {
  settings: SecuritySettings
  usage: {
    limits: { storageMb: number }
    usage: { devices: number; securityAlerts: number; storageMb?: number }
  }
  sessions: Array<{ id: string; device_name: string | null; ip_address: string | null; last_seen_at: string }>
  rate_limit_events: number
}

type SecurityForm = Omit<SecuritySettings, 'ip_allowlist'> & {
  ip_allowlist: string
  storage_quota_mb: number
}

const INITIAL_FORM: SecurityForm = {
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
}

function formFromData(data: SecurityData): SecurityForm {
  return {
    ...data.settings,
    ip_allowlist: (data.settings.ip_allowlist || []).join('\n'),
    storage_quota_mb: data.usage.limits.storageMb,
  }
}

export default function SecurityCenterPage() {
  const [data, setData] = useState<SecurityData | null>(null)
  const [form, setForm] = useState<SecurityForm>(INITIAL_FORM)
  const [savedForm, setSavedForm] = useState<SecurityForm>(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/security-center')
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load security center.')
      const nextForm = formFromData(result as SecurityData)
      setData(result)
      setForm(nextForm)
      setSavedForm(nextForm)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load security center.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm])
  const posture = useMemo(() => {
    const checks = [
      form.require_2fa, form.device_tracking_enabled, form.rate_limit_enabled,
      form.session_history_enabled, form.compliance_policy.require_document_approval,
      form.backup_policy.frequency === 'daily', form.ip_allowlist.trim().length > 0,
      form.session_timeout_minutes <= 480,
    ]
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100)
    if (score >= 88) return { score, label: 'Hardened', ring: 'stroke-emerald-500' }
    if (score >= 63) return { score, label: 'Protected', ring: 'stroke-amber-500' }
    return { score, label: 'Needs attention', ring: 'stroke-red-500' }
  }, [form])

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/security-center', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ip_allowlist: form.ip_allowlist.split('\n').map((item) => item.trim()).filter(Boolean),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save settings.')
      setMessage('Security policy saved and added to the audit log.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SecuritySkeleton />

  if (error && !data) {
    return <div className="dx-page"><Panel tone="danger"><AlertTriangle className="h-5 w-5 shrink-0" /><div><p className="font-black">Security Center could not be loaded</p><p className="mt-1 opacity-80">{error}</p></div><button type="button" onClick={() => void load()} className="dx-button dx-button-secondary ml-auto">Try again</button></Panel></div>
  }

  return (
    <div className="dx-page space-y-5 pb-28">
      <header className="relative overflow-hidden rounded-2xl bg-[#102a24] px-5 py-6 text-white shadow-[0_18px_50px_rgba(16,42,36,0.16)] sm:px-7 lg:px-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border-[44px] border-white/[0.035]" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/75"><ShieldHalf className="h-4 w-4" /> Workspace protection</div>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-[-0.045em] sm:text-4xl">Security Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/65">Set access safeguards, monitor recent activity, and keep staff data handling aligned with your organisation’s policy.</p>
            <div className="mt-5 flex flex-wrap gap-2"><StatusChip active={form.require_2fa}>2FA policy</StatusChip><StatusChip active={form.device_tracking_enabled}>Device tracking</StatusChip><StatusChip active={form.rate_limit_enabled}>Rate monitoring</StatusChip></div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
            <ScoreRing score={posture.score} ring={posture.ring} />
            <div className="pr-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Security posture</p><p className="mt-1 text-lg font-black">{posture.label}</p><p className="mt-1 text-xs text-emerald-50/55">Based on 8 workspace controls</p></div>
          </div>
        </div>
      </header>

      <section aria-label="Security overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Laptop />} label="Known devices" value={data?.usage.usage.devices || 0} detail="Tracked across your workspace" />
        <Metric icon={<Activity />} label="Security alerts" value={data?.usage.usage.securityAlerts || 0} detail="Recorded events requiring review" warning={Boolean(data?.usage.usage.securityAlerts)} />
        <Metric icon={<Gauge />} label="Rate-limit events" value={data?.rate_limit_events || 0} detail="Blocked or throttled requests" warning={Boolean(data?.rate_limit_events)} />
        <Metric icon={<HardDrive />} label="Storage policy" value={`${form.storage_quota_mb.toLocaleString()} MB`} detail="Configured reporting quota" />
      </section>

      {error ? <Panel tone="danger"><AlertTriangle className="h-5 w-5 shrink-0" /><span>{error}</span></Panel> : null}
      {message ? <Panel tone="success"><CheckCircle2 className="h-5 w-5 shrink-0" /><span>{message}</span></Panel> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <SettingsSection eyebrow="Identity & access" title="Control who gets in" description="Protect administrative access and preserve evidence for investigations." icon={<LockKeyhole className="h-5 w-5" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle icon={<KeyRound />} label="Require 2FA" desc="Record the requirement for all system users. MFA enforcement must also be enabled in the auth provider." value={form.require_2fa} onChange={(value) => setForm((prev) => ({ ...prev, require_2fa: value }))} />
              <Toggle icon={<Fingerprint />} label="Device login tracking" desc="Associate sign-ins with known devices for faster investigation." value={form.device_tracking_enabled} onChange={(value) => setForm((prev) => ({ ...prev, device_tracking_enabled: value }))} />
              <Toggle icon={<Clock3 />} label="Session history" desc="Retain recent device and login activity for administrators." value={form.session_history_enabled} onChange={(value) => setForm((prev) => ({ ...prev, session_history_enabled: value }))} />
              <Toggle icon={<Gauge />} label="Rate-limit monitoring" desc="Record throttling events that may indicate abuse or automation." value={form.rate_limit_enabled} onChange={(value) => setForm((prev) => ({ ...prev, rate_limit_enabled: value }))} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <NumberField label="Session timeout" description="Automatically expire inactive sessions." suffix="minutes" min={15} max={10080} value={form.session_timeout_minutes} onChange={(value) => setForm((prev) => ({ ...prev, session_timeout_minutes: value }))} />
              <div className="rounded-xl border border-[var(--dx-line)] bg-[var(--dx-surface-muted)] p-4">
                <div className="flex items-start gap-3"><Globe2 className="mt-0.5 h-5 w-5 text-[var(--dx-muted)]" /><div><label htmlFor="ip-allowlist" className="text-sm font-black text-[var(--dx-ink)]">IP allowlist</label><p className="mt-1 text-xs leading-5 text-[var(--dx-muted)]">One IPv4, IPv6, or CIDR range per line. Leave blank to allow all addresses.</p></div></div>
                <textarea id="ip-allowlist" value={form.ip_allowlist} onChange={(event) => setForm((prev) => ({ ...prev, ip_allowlist: event.target.value }))} rows={4} spellCheck={false} placeholder={'203.0.113.10\n198.51.100.0/24'} className="mt-4 w-full resize-y rounded-xl border border-[var(--dx-line)] bg-white px-3.5 py-3 font-mono text-xs font-semibold leading-5 text-[var(--dx-ink)] outline-none transition focus:border-[var(--dx-signal)] focus:ring-4 focus:ring-emerald-500/10" />
                <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Policy is stored here; middleware enforcement must be enabled separately.</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Staff controls" title="Protect sensitive staff workflows" description="Choose which actions staff can take and where an administrator must approve changes." icon={<UsersRound className="h-5 w-5" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Toggle compact label="Document approval" desc="Hold new and renewed documents for review." value={form.compliance_policy.require_document_approval} onChange={(value) => setForm((prev) => ({ ...prev, compliance_policy: { ...prev.compliance_policy, require_document_approval: value } }))} />
              <Toggle compact label="Staff self-service" desc="Allow renewal uploads and correction requests." value={form.compliance_policy.allow_staff_self_service} onChange={(value) => setForm((prev) => ({ ...prev, compliance_policy: { ...prev.compliance_policy, allow_staff_self_service: value } }))} />
              <Toggle compact label="ID downloads" desc="Allow active staff to download their own ID." value={form.compliance_policy.allow_staff_id_download} onChange={(value) => setForm((prev) => ({ ...prev, compliance_policy: { ...prev.compliance_policy, allow_staff_id_download: value } }))} />
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Resilience" title="Retention & recovery policy" description="Document the operating limits used by exports, storage reporting, and backup procedures." icon={<DatabaseBackup className="h-5 w-5" />}>
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField label="Storage quota" description="Reporting limit for uploaded files." suffix="MB" min={1} value={form.storage_quota_mb} onChange={(value) => setForm((prev) => ({ ...prev, storage_quota_mb: value }))} />
              <label className="block"><FieldLabel>Backup frequency</FieldLabel><select value={form.backup_policy.frequency} onChange={(event) => setForm((prev) => ({ ...prev, backup_policy: { ...prev.backup_policy, frequency: event.target.value } }))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--dx-line)] bg-white px-3.5 text-sm font-bold text-[var(--dx-ink)] outline-none focus:border-[var(--dx-signal)]"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><p className="mt-2 text-xs leading-5 text-[var(--dx-muted)]">Target schedule for backup procedures.</p></label>
              <NumberField label="Retention period" description="Keep recoverable backups for this period." suffix="days" min={7} max={365} value={form.backup_policy.retention_days} onChange={(value) => setForm((prev) => ({ ...prev, backup_policy: { ...prev.backup_policy, retention_days: value } }))} />
            </div>
          </SettingsSection>
        </main>

        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--dx-line)] bg-white">
            <div className="border-b border-[var(--dx-line)] px-5 py-4"><p className="dx-eyebrow">Live activity</p><div className="mt-2 flex items-center justify-between gap-3"><h2 className="text-lg font-black tracking-[-0.03em] text-[var(--dx-ink)]">Recent sessions</h2><button type="button" onClick={() => void load()} aria-label="Refresh security activity" className="rounded-lg p-2 text-[var(--dx-muted)] transition hover:bg-[var(--dx-surface-muted)] hover:text-[var(--dx-ink)]"><RefreshCw className="h-4 w-4" /></button></div></div>
            <div className="divide-y divide-[var(--dx-line)]">{data?.sessions.length ? data.sessions.slice(0, 6).map((session) => <SessionRow key={session.id} session={session} />) : <div className="px-5 py-10 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-emerald-600" /><p className="mt-3 text-sm font-black text-[var(--dx-ink)]">No recent sessions</p><p className="mt-1 text-xs text-[var(--dx-muted)]">Activity will appear here when tracking is enabled.</p></div>}</div>
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h2 className="text-sm font-black text-amber-950">Configuration vs enforcement</h2><p className="mt-2 text-xs leading-5 text-amber-900/70">2FA and IP policies are safely recorded and audited here. They only block access after enforcement is connected in authentication and middleware.</p></div></div></section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--dx-line)] bg-white/95 px-4 py-3 shadow-[0_-12px_35px_rgba(16,42,36,0.08)] backdrop-blur lg:left-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><div className="min-w-0"><p className="text-xs font-black text-[var(--dx-ink)]">{isDirty ? 'Unsaved security changes' : 'Security policy is up to date'}</p><p className="mt-0.5 truncate text-[10px] text-[var(--dx-muted)]">Changes are tenant-scoped and recorded in the audit log.</p></div><div className="flex shrink-0 items-center gap-2">{isDirty ? <button type="button" onClick={() => setForm(savedForm)} disabled={saving} className="dx-button dx-button-secondary">Discard</button> : null}<button type="button" onClick={() => void save()} disabled={saving || !isDirty} className="dx-button dx-button-primary min-w-36 disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save policy'}</button></div></div>
      </div>
    </div>
  )
}

function ScoreRing({ score, ring }: { score: number; ring: string }) {
  const circumference = 2 * Math.PI * 28
  return <div className="relative h-20 w-20 shrink-0"><svg viewBox="0 0 68 68" className="h-full w-full -rotate-90"><circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6" /><circle cx="34" cy="34" r="28" fill="none" strokeWidth="6" strokeLinecap="round" className={ring} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} /></svg><span className="absolute inset-0 flex items-center justify-center text-lg font-black">{score}</span></div>
}

function StatusChip({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${active ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/5 text-white/45'}`}>{active ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}</span>
}

function Metric({ icon, label, value, detail, warning = false }: { icon: React.ReactNode; label: string; value: number | string; detail: string; warning?: boolean }) {
  return <article className="rounded-xl border border-[var(--dx-line)] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--dx-muted)]">{label}</p><p className={`mt-2 text-2xl font-black tracking-[-0.04em] ${warning ? 'text-amber-700' : 'text-[var(--dx-ink)]'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4 ${warning ? 'bg-amber-100 text-amber-700' : 'bg-[var(--dx-surface-muted)] text-[var(--dx-muted-strong)]'}`}>{icon}</span></div><p className="mt-3 text-[10px] leading-4 text-[var(--dx-muted)]">{detail}</p></article>
}

function SettingsSection({ eyebrow, title, description, icon, children }: { eyebrow: string; title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-[var(--dx-line)] bg-white"><div className="flex items-start gap-3 border-b border-[var(--dx-line)] px-5 py-5 sm:px-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dx-surface-muted)] text-[var(--dx-muted-strong)]">{icon}</span><div><p className="dx-eyebrow">{eyebrow}</p><h2 className="mt-1.5 text-lg font-black tracking-[-0.03em] text-[var(--dx-ink)]">{title}</h2><p className="mt-1 text-xs leading-5 text-[var(--dx-muted)]">{description}</p></div></div><div className="p-5 sm:p-6">{children}</div></section>
}

function Toggle({ icon, label, desc, value, onChange, compact = false }: { icon?: React.ReactNode; label: string; desc: string; value: boolean; onChange: (value: boolean) => void; compact?: boolean }) {
  return <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} className={`group flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 ${value ? 'border-emerald-200 bg-emerald-50/60' : 'border-[var(--dx-line)] bg-white hover:bg-[var(--dx-surface-muted)]'} ${compact ? 'min-h-32 flex-col' : 'min-h-36'}`}><span className="flex min-w-0 gap-3">{icon ? <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4 ${value ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--dx-surface-muted)] text-[var(--dx-muted)]'}`}>{icon}</span> : null}<span><span className="block text-sm font-black text-[var(--dx-ink)]">{label}</span><span className="mt-1.5 block text-xs leading-5 text-[var(--dx-muted)]">{desc}</span></span></span><span className={`mt-0.5 flex h-6 w-11 shrink-0 rounded-full p-0.5 transition ${value ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : ''}`} /></span></button>
}

function NumberField({ label, description, suffix, value, min, max, onChange }: { label: string; description: string; suffix: string; value: number; min: number; max?: number; onChange: (value: number) => void }) {
  return <label className="block"><FieldLabel>{label}</FieldLabel><span className="mt-2 flex min-h-11 items-center rounded-xl border border-[var(--dx-line)] bg-white px-3.5 transition focus-within:border-[var(--dx-signal)] focus-within:ring-4 focus-within:ring-emerald-500/10"><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--dx-ink)] outline-none" /><span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--dx-muted)]">{suffix}</span></span><p className="mt-2 text-xs leading-5 text-[var(--dx-muted)]">{description}</p></label>
}

function FieldLabel({ children }: { children: React.ReactNode }) { return <span className="text-xs font-black text-[var(--dx-muted-strong)]">{children}</span> }

function SessionRow({ session }: { session: SecurityData['sessions'][number] }) {
  const device = session.device_name || 'Unknown device'
  const DeviceIcon = /phone|mobile|android|iphone/i.test(device) ? Smartphone : Laptop
  const seenDate = new Date(session.last_seen_at)
  const seen = Number.isNaN(seenDate.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(seenDate)
  return <div className="flex gap-3 px-5 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dx-surface-muted)] text-[var(--dx-muted-strong)]"><DeviceIcon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-black text-[var(--dx-ink)]">{device}</p><p className="mt-1 truncate font-mono text-[10px] text-[var(--dx-muted)]">{session.ip_address || 'IP unavailable'}</p><p className="mt-1 text-[10px] text-[var(--dx-muted)]">{seen}</p></div></div>
}

function Panel({ children, tone }: { children: React.ReactNode; tone: 'danger' | 'success' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${styles}`}>{children}</div>
}

function SecuritySkeleton() {
  return <div className="dx-page space-y-5"><div className="h-64 animate-pulse rounded-2xl bg-[#102a24]/90" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-white" />)}</div><div className="grid gap-5 xl:grid-cols-[1fr_360px]"><div className="h-[680px] animate-pulse rounded-2xl bg-white" /><div className="h-96 animate-pulse rounded-2xl bg-white" /></div></div>
}
