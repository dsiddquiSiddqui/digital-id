import Link from 'next/link'
import { TimerOff } from 'lucide-react'

export default function SessionExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <TimerOff className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Session expired</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your workspace session timed out based on the security policy. Sign in again to continue.
        </p>
        <Link href="/login" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
          Sign in again
        </Link>
      </section>
    </main>
  )
}
