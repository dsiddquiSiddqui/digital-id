import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          The page may have moved, expired, or never existed in this workspace.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
          Back to dashboard
        </Link>
      </section>
    </main>
  )
}
