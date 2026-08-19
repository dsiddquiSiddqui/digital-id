'use client'

import Link from 'next/link'
import { Inbox, Loader2 } from 'lucide-react'

export function AdminEmptyState({
  title,
  body,
  href,
  action,
}: {
  title: string
  body: string
  href?: string
  action?: string
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p>
      {href && action ? (
        <Link
          href={href}
          className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          {action}
        </Link>
      ) : null}
    </div>
  )
}

export function AdminSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded-full bg-slate-100" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SavingLabel({ saving, idle }: { saving: boolean; idle: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {saving ? 'Saving...' : idle}
    </span>
  )
}
