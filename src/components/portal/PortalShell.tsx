'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Activity, Bell, Building2, CheckSquare, ChevronRight, CircleDollarSign, ClipboardList, FileBarChart, LayoutDashboard, LifeBuoy, LogOut, Menu, RefreshCw, Search, Settings, ShieldCheck, UserRoundCog, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePortal } from './PortalProvider'

const navigation = [
  { href: '/portal/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/portal/organizations', label: 'Organizations', icon: Building2 },
  { href: '/portal/support', label: 'Support desk', icon: LifeBuoy },
  { href: '/portal/users', label: 'Portal users', icon: UserRoundCog },
  { href: '/portal/billing', label: 'Billing', icon: CircleDollarSign },
  { href: '/portal/security', label: 'Security', icon: ShieldCheck },
  { href: '/portal/tasks', label: 'Tasks & approvals', icon: CheckSquare },
  { href: '/portal/reports', label: 'Reports', icon: FileBarChart },
  { href: '/portal/notifications', label: 'Notifications', icon: Bell },
  { href: '/portal/audit-logs', label: 'Audit logs', icon: ClipboardList },
  { href: '/portal/settings', label: 'Settings', icon: Settings },
]

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { tickets, loading, lastUpdated, refresh } = usePortal()
  const [open, setOpen] = useState(false)
  const openTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length
  const logout = async () => { await createClient().auth.signOut(); router.replace('/portal/login') }

  return <main className="min-h-screen bg-[#eef1eb] text-[#152019]">
    {open ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} /> : null}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#101713] text-white shadow-2xl transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="border-b border-white/10 p-5"><div className="flex items-center justify-between"><Link href="/portal/dashboard" className="rounded-xl bg-white px-3 py-2"><Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} className="h-auto w-40" priority /></Link><button aria-label="Close navigation" className="p-2 text-white/60 lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div><div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#b8f43d]"><Activity className="h-3.5 w-3.5" />Platform operations</div></div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Portal navigation"><p className="px-3 pb-2 pt-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Control plane</p><div className="space-y-1">{navigation.map((item) => { const active = pathname === item.href || (item.href !== '/portal/dashboard' && pathname.startsWith(`${item.href}/`)); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`}><Icon className={`h-4 w-4 ${active ? 'text-[#b8f43d]' : 'text-white/35'}`} /><span className="flex-1">{item.label}</span>{item.href === '/portal/support' && openTickets ? <span className="rounded-full bg-[#b8f43d] px-2 py-0.5 text-[10px] font-black text-[#101713]">{openTickets}</span> : null}{active ? <ChevronRight className="h-3.5 w-3.5 text-white/35" /> : null}</Link>})}</div></nav>
      <div className="border-t border-white/10 p-3"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/55 hover:bg-white/[0.06] hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></div>
    </aside>
    <div className="lg:pl-[272px]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f8faf6]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1500px] items-center gap-3"><button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-xl border border-black/10 bg-white p-2.5 lg:hidden"><Menu className="h-5 w-5" /></button><Link href="/portal/organizations" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#718078] shadow-sm sm:max-w-lg"><Search className="h-4 w-4" /><span className="truncate">Search organizations and accounts</span><kbd className="ml-auto hidden rounded border border-black/10 bg-[#f2f4ef] px-1.5 py-0.5 text-[10px] font-black sm:inline">⌘ K</kbd></Link><span className="hidden text-xs font-bold text-[#718078] xl:inline">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Connecting…'}</span><button aria-label="Refresh portal data" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-black/10 bg-white p-2.5 text-[#627068] hover:bg-[#f1f4ed] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button><button aria-label="Notifications" className="relative rounded-xl border border-black/10 bg-white p-2.5 text-[#627068]"><Bell className="h-4 w-4" />{openTickets ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" /> : null}</button></div></header>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
    </div>
  </main>
}
