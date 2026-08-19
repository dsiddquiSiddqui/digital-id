'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          The app hit an unexpected error. Try again, and check logs if it repeats.
        </p>
        {error.digest ? <p className="mt-3 text-xs font-bold text-slate-400">Error ID: {error.digest}</p> : null}
        <button onClick={reset} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </section>
    </main>
  )
}
