'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Activity, Bell, Building2, CheckSquare, ChevronDown, ChevronRight, CircleDollarSign, ClipboardList, FileBarChart, LayoutDashboard, LifeBuoy, LogOut, Menu, Newspaper, RefreshCw, Settings, ShieldCheck, UserRoundCog, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePortal } from './PortalProvider'
import { PortalCommand } from './PortalCommand'
import { buildPortalNotifications } from '@/lib/portal-notifications'

const navigation = [
  { href: '/portal/dashboard', label: 'Overview', icon: LayoutDashboard, roles: [] },
  { href: '/portal/organizations', label: 'Organizations', icon: Building2, roles: [] },
  { href: '/portal/support', label: 'Support desk', icon: LifeBuoy, roles: ['owner', 'administrator', 'support_agent'] },
  { href: '/portal/users', label: 'Portal users', icon: UserRoundCog, roles: ['owner', 'administrator'] },
  { href: '/portal/posts', label: 'Posts', icon: Newspaper, roles: ['owner', 'administrator'] },
  { href: '/portal/billing', label: 'Billing', icon: CircleDollarSign, roles: ['owner', 'administrator', 'billing_agent'] },
  { href: '/portal/security', label: 'Security', icon: ShieldCheck, roles: ['owner', 'administrator', 'auditor'] },
  { href: '/portal/tasks', label: 'Tasks & approvals', icon: CheckSquare, roles: ['owner', 'administrator', 'support_agent'] },
  { href: '/portal/reports', label: 'Reports', icon: FileBarChart, roles: [] },
  { href: '/portal/notifications', label: 'Notifications', icon: Bell, roles: [] },
  { href: '/portal/audit-logs', label: 'Audit logs', icon: ClipboardList, roles: ['owner', 'administrator', 'auditor'] },
  { href: '/portal/settings', label: 'Settings', icon: Settings, roles: ['owner', 'administrator'] },
]

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { tickets, tasks, approvals, organizations, notificationStates, access, loading, error, lastUpdated, refresh } = usePortal()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const openTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length
  const role = access?.platform_role || 'administrator'
  const visibleNavigation = navigation.filter((item) => item.roles.length === 0 || item.roles.includes(role))
  const notificationItems = buildPortalNotifications({ tasks, approvals, tickets, organizations })
  const stateMap = new Map(notificationStates.map((state) => [state.item_key, state]))
  const unreadCount = notificationItems.filter((item) => !stateMap.get(item.id)?.read_at).length
  const currentLabel = navigation.find((item) => pathname === item.href || (item.href !== '/portal/dashboard' && pathname.startsWith(`${item.href}/`)))?.label || 'Platform portal'
  const logout = async () => { await createClient().auth.signOut(); router.replace('/portal/login') }

  return <main className="min-h-screen bg-[#eef1eb] text-[#152019]">
    <a href="#portal-content" className="fixed left-3 top-3 z-[200] -translate-y-24 rounded-lg bg-[#152019] px-4 py-2 text-sm font-black text-white focus:translate-y-0">Skip to portal content</a>
    {open ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} /> : null}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#101713] text-white shadow-2xl transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="border-b border-white/10 p-5"><div className="flex items-center justify-between"><Link href="/portal/dashboard" className="rounded-xl bg-white px-3 py-2"><Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} className="h-auto w-40" priority /></Link><button aria-label="Close navigation" className="p-2 text-white/60 lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div><div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#dcebc9]"><Activity className="h-3.5 w-3.5" />Platform operations</div></div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Portal navigation"><p className="px-3 pb-2 pt-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Control plane</p><div className="space-y-1">{visibleNavigation.map((item) => { const active = pathname === item.href || (item.href !== '/portal/dashboard' && pathname.startsWith(`${item.href}/`)); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`}><Icon className={`h-4 w-4 ${active ? 'text-[#dcebc9]' : 'text-white/35'}`} /><span className="flex-1">{item.label}</span>{item.href === '/portal/support' && openTickets ? <span className="rounded-full bg-[#dcebc9] px-2 py-0.5 text-[10px] font-black text-[#101713]">{openTickets}</span> : null}{item.href === '/portal/notifications' && unreadCount ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{Math.min(99, unreadCount)}</span> : null}{active ? <ChevronRight className="h-3.5 w-3.5 text-white/35" /> : null}</Link>})}</div></nav>
      <div className="border-t border-white/10 p-3"><div className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dcebc9] text-xs font-black text-[#152019]">{access?.full_name?.[0] || 'P'}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{access?.full_name || 'Portal operator'}</p><p className="truncate text-[10px] font-bold capitalize text-white/40">{role.replaceAll('_', ' ')}</p></div></div><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/55 hover:bg-white/[0.06] hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></div>
    </aside>
    <div className="lg:pl-[272px]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f8faf6]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1500px] items-center gap-3"><button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-xl border border-black/10 bg-white p-2.5 lg:hidden"><Menu className="h-5 w-5" /></button><div className="hidden min-w-28 lg:block"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#8a968f]">Control plane</p><p className="truncate text-xs font-black">{currentLabel}</p></div><PortalCommand /><span className="hidden text-xs font-bold text-[#718078] xl:inline">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Connecting…'}</span><button aria-label="Refresh portal data" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-black/10 bg-white p-2.5 text-[#627068] hover:bg-[#f1f4ed] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button><Link href="/portal/notifications" aria-label={`${unreadCount} unread notifications`} className="relative rounded-xl border border-black/10 bg-white p-2.5 text-[#627068]"><Bell className="h-4 w-4" />{unreadCount ? <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-black text-white ring-2 ring-white">{Math.min(99, unreadCount)}</span> : null}</Link><div className="relative hidden sm:block"><button type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen((value) => !value)} className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-left"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#152019] text-[9px] font-black text-[#dcebc9]">{access?.full_name?.[0] || 'P'}</span><ChevronDown className="h-3.5 w-3.5 text-[#718078]" /></button>{accountOpen ? <div className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-black/10 bg-white p-3 shadow-xl"><p className="truncate text-sm font-black">{access?.full_name || 'Portal operator'}</p><p className="mt-0.5 truncate text-xs text-[#718078]">{access?.email}</p><p className="mt-3 rounded-lg bg-[#eef1eb] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#60704e]">{role.replaceAll('_', ' ')}</p><button type="button" onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50"><LogOut className="h-3.5 w-3.5" />Sign out</button></div> : null}</div></div></header>
      <div id="portal-content" tabIndex={-1} className="mx-auto max-w-[1500px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">{error ? <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 sm:flex-row sm:items-center"><span className="flex-1">Some portal data could not be refreshed. {error}</span><button type="button" onClick={() => void refresh()} className="rounded-lg bg-amber-900 px-3 py-2 text-xs font-black text-white">Retry</button></div> : null}{children}</div>
    </div>
  </main>
}
