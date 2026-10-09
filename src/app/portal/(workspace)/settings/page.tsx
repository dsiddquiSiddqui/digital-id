'use client'

import { Bell, Check, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { usePortal } from '@/components/portal/PortalProvider'
import { PageHeader, Panel, StatusPill } from '@/components/portal/PortalUi'

const roles = [
  { name: 'Owner', permissions: ['Full organization control', 'Portal user management', 'Support and billing management', 'Audit access'] },
  { name: 'Administrator', permissions: ['Organization management', 'Portal user management', 'Support management', 'Billing and audit visibility'] },
  { name: 'Support agent', permissions: ['Organization visibility', 'Support management', 'Audit visibility'] },
  { name: 'Billing agent', permissions: ['Organization visibility', 'Billing management', 'Support and audit visibility'] },
  { name: 'Auditor', permissions: ['Read-only organizations', 'Read-only support and billing', 'Audit visibility'] },
]

export default function SettingsPage() {
  const { access } = usePortal()
  return <div className="space-y-6"><PageHeader eyebrow="Platform governance" title="Portal settings" description="Review your operator access, role model, notification policy, and built-in control standards." />
    <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><div className="space-y-5"><Panel title="Your access" description="Effective role and permissions for this portal session."><div className="flex items-center gap-3 rounded-xl bg-[#152019] p-4 text-white"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b8f43d] font-black text-[#152019]">{access?.full_name?.[0] || 'P'}</span><div className="min-w-0 flex-1"><p className="truncate font-black">{access?.full_name || 'Portal operator'}</p><p className="truncate text-xs text-white/45">{access?.email}</p></div><StatusPill value={access?.platform_role || 'administrator'} /></div><div className="mt-4 space-y-2">{access?.platform_permissions.map((permission) => <div key={permission} className="flex items-center gap-2 rounded-lg bg-[#f7f8f5] px-3 py-2 text-xs font-bold"><Check className="h-3.5 w-3.5 text-[#66814a]" />{permission}</div>)}</div></Panel><Panel title="Security baseline" description="Controls enforced throughout platform operations."><Control icon={<LockKeyhole />} title="Audited mutations" detail="Every privileged change is written to the audit trail." /><Control icon={<KeyRound />} title="Explicit confirmations" detail="High-risk changes require deliberate confirmation." /><Control icon={<ShieldCheck />} title="Service-role isolation" detail="Platform operations tables are unavailable to tenant sessions." /><Control icon={<Bell />} title="Risk-derived notifications" detail="Alerts are generated from live operational state." /></Panel></div>
      <Panel title="Platform role matrix" description="The standard permission bundles applied when operators are created or reassigned."><div className="space-y-4">{roles.map((role) => <article key={role.name} className="rounded-xl border border-black/8 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-black">{role.name}</h3>{role.name.toLowerCase() === (access?.platform_role || '').replaceAll('_', ' ') ? <StatusPill value="active" /> : null}</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{role.permissions.map((permission) => <p key={permission} className="flex items-start gap-2 text-xs font-bold text-[#657269]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#78924e]" />{permission}</p>)}</div></article>)}</div><p className="mt-5 rounded-xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">Role bundles are security-sensitive and managed through the Portal Users workflow. Database row-level security and API checks remain authoritative.</p></Panel></section>
  </div>
}
function Control({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className="flex gap-3 border-b border-black/5 py-3 last:border-0 last:pb-0"><span className="mt-0.5 [&>svg]:h-4 [&>svg]:w-4 text-[#78924e]">{icon}</span><div><p className="text-sm font-black">{title}</p><p className="mt-1 text-xs leading-5 text-[#718078]">{detail}</p></div></div> }
