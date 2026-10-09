'use client'

import Link from 'next/link'
import { KeyRound, LockKeyhole, ShieldAlert, ShieldCheck, UserRoundCog } from 'lucide-react'
import { usePortal } from '@/components/portal/PortalProvider'
import { PageHeader, Panel, StatusPill, formatDateTime } from '@/components/portal/PortalUi'

export default function SecurityPage() {
  const { users, organizations } = usePortal()
  const activeUsers = users.filter((user) => user.is_active)
  const admins = activeUsers.filter((user) => ['owner', 'administrator'].includes(user.platform_role || 'administrator'))
  const dormant = activeUsers.filter((user) => user.portal_last_active_at && Date.now() - new Date(user.portal_last_active_at).getTime() > 30 * 86400000)
  const suspended = organizations.filter((organization) => organization.status === 'suspended')
  return <div className="space-y-6"><PageHeader eyebrow="Trust and control" title="Security centre" description="Privileged access posture, dormant operators, and tenant-level security intervention." />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SecurityStat icon={<UserRoundCog />} label="Active operators" value={activeUsers.length} /><SecurityStat icon={<KeyRound />} label="Administrators" value={admins.length} /><SecurityStat icon={<LockKeyhole />} label="Dormant access" value={dormant.length} warning={dormant.length > 0} /><SecurityStat icon={<ShieldAlert />} label="Suspended tenants" value={suspended.length} warning={suspended.length > 0} /></section>
    <section className="grid gap-5 xl:grid-cols-2"><Panel title="Privileged access review" description="Administrators with broad platform authority."><div className="divide-y divide-black/5">{admins.map((user) => <Link key={user.id} href="/portal/users" className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#152019] font-black text-[#b8f43d]">{user.full_name[0]}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{user.full_name}</p><p className="truncate text-xs text-[#718078]">{user.email} · last active {formatDateTime(user.portal_last_active_at)}</p></div><StatusPill value={user.platform_role || 'administrator'} /></Link>)}</div></Panel><Panel title="Tenant intervention" description="Organizations currently blocked from normal access."><div className="space-y-3">{suspended.length ? suspended.map((organization) => <Link key={organization.id} href={`/portal/organizations/${organization.id}`} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3"><ShieldCheck className="h-4 w-4 text-red-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{organization.name}</p><p className="text-xs text-red-700/70">{organization.plan_name} · {organization.staff_count} staff records</p></div><StatusPill value="suspended" /></Link>) : <p className="rounded-xl bg-[#f7f8f5] p-4 text-sm text-[#718078]">No organizations are currently suspended.</p>}</div></Panel></section>
  </div>
}
function SecurityStat({ icon, label, value, warning = false }: { icon: React.ReactNode; label: string; value: number; warning?: boolean }) { return <article className={`rounded-[22px] border p-5 ${warning ? 'border-amber-200 bg-amber-50' : 'border-black/10 bg-white'}`}><div className="flex justify-between"><p className="text-[10px] font-black uppercase tracking-[.14em] opacity-55">{label}</p><span className="[&>svg]:h-4 [&>svg]:w-4 opacity-55">{icon}</span></div><p className="mt-4 text-3xl font-black">{value}</p></article> }
