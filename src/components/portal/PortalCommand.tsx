'use client'

import Link from 'next/link'
import { Building2, LifeBuoy, Search, UserRoundCog, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePortal } from './PortalProvider'

export function PortalCommand() {
  const { organizations, users, tickets } = usePortal()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const close = () => { setOpen(false); setQuery('') }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen((value) => !value) }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()) }, [open])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return [
      ...organizations.filter((item) => [item.name, item.slug, item.plan_name].some((value) => value.toLowerCase().includes(term))).slice(0, 6).map((item) => ({ id: `organization-${item.id}`, label: item.name, detail: `${item.plan_name} · ${item.status}`, href: `/portal/organizations/${item.id}`, icon: Building2 })),
      ...users.filter((item) => [item.full_name, item.email, item.platform_role].some((value) => value?.toLowerCase().includes(term))).slice(0, 5).map((item) => ({ id: `user-${item.id}`, label: item.full_name, detail: `${item.email} · ${(item.platform_role || 'administrator').replaceAll('_', ' ')}`, href: '/portal/users', icon: UserRoundCog })),
      ...tickets.filter((item) => [item.subject, item.organization?.name, String(item.ticket_number)].some((value) => value?.toLowerCase().includes(term))).slice(0, 5).map((item) => ({ id: `ticket-${item.id}`, label: item.subject, detail: `Case #${item.ticket_number} · ${item.status.replaceAll('_', ' ')}`, href: `/portal/support?ticket=${item.id}`, icon: LifeBuoy })),
    ].slice(0, 12)
  }, [organizations, query, tickets, users])

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-left text-sm text-[#718078] shadow-sm sm:max-w-lg"><Search className="h-4 w-4" /><span className="truncate">Search organizations, users, and cases</span><kbd className="ml-auto hidden rounded border border-black/10 bg-[#f2f4ef] px-1.5 py-0.5 text-[10px] font-black sm:inline">⌘ K</kbd></button>
    {open ? <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 px-4 pt-[10vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Portal search"><button aria-label="Close portal search" className="absolute inset-0" onClick={close} /><section className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl"><div className="flex items-center gap-3 border-b border-black/10 px-4"><Search className="h-5 w-5 text-[#78924e]" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the control plane…" className="h-16 min-w-0 flex-1 bg-transparent text-base font-bold outline-none" /><button type="button" onClick={close} aria-label="Close search" className="rounded-lg p-2 text-[#718078] hover:bg-[#eef1eb]"><X className="h-5 w-5" /></button></div><div className="max-h-[55vh] overflow-y-auto p-2">{query.trim() && !results.length ? <p className="px-4 py-10 text-center text-sm font-bold text-[#718078]">No organizations, operators, or support cases match this search.</p> : null}{!query.trim() ? <p className="px-4 py-8 text-center text-sm text-[#718078]">Start typing to search across the platform.</p> : results.map((item) => { const Icon = item.icon; return <Link key={item.id} href={item.href} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#f2f4ef]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#152019] text-[#b8f43d]"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-black">{item.label}</span><span className="mt-0.5 block truncate text-xs text-[#718078]">{item.detail}</span></span></Link> })}</div></section></div> : null}
  </>
}
