'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Command, Search, X } from 'lucide-react'

type CommandResult = {
  label: string
  detail?: string
  href: string
  type: string
}

export default function AdminCommandBar({ pageTitle }: { pageTitle: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommandResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      const response = await fetch(`/api/admin/command-search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      }).catch(() => null)
      if (response?.ok) {
        const result = await response.json()
        setResults(result.results || [])
      }
      setLoading(false)
    }

    const timer = window.setTimeout(load, query ? 180 : 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  const placeholder = useMemo(() => `Search ${pageTitle.toLowerCase()}, staff, users, tools...`, [pageTitle])

  const go = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-[320px] items-center justify-between rounded-2xl bg-[#f8fafc] px-4 py-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-100 md:flex"
      >
        <span className="inline-flex items-center gap-3 text-sm text-slate-400">
          <Search className="h-4 w-4" />
          {placeholder}
        </span>
        <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200">
          Ctrl K
        </span>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Open command search"
      >
        <Search className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/35 px-4 py-20 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <Command className="h-5 w-5 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && results[0]) go(results[0].href)
                }}
                placeholder="Type a page, staff name, user, or setting..."
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close command search">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3">
              {loading ? <p className="px-3 py-5 text-sm text-slate-500">Searching...</p> : null}
              {!loading && results.length === 0 ? <p className="px-3 py-5 text-sm text-slate-500">No results found.</p> : null}
              {results.map((item) => (
                <Link
                  key={`${item.type}-${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                  }}
                  className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm transition hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-black text-slate-950">{item.label}</span>
                    {item.detail ? <span className="mt-1 block truncate text-xs text-slate-500">{item.detail}</span> : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {item.type}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
