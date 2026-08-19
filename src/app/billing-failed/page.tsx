import Link from 'next/link'
import { CreditCard } from 'lucide-react'

export default function BillingFailedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <CreditCard className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Billing action needed</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Payment failed or the billing provider needs attention. An admin can resolve this from Billing.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/billing" className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Open billing
          </Link>
          <Link href="/help" className="inline-flex rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">
            Help center
          </Link>
        </div>
      </section>
    </main>
  )
}
