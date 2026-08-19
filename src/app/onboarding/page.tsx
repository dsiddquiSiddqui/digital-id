import Link from 'next/link'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { OnboardingForm } from './OnboardingForm'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>
}) {
  const { plan } = await searchParams
  const initialPlan = typeof plan === 'string' ? plan : 'free'

  return (
    <main className="min-h-screen bg-[#eef3f8] px-5 py-8 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] lg:grid-cols-[0.86fr_1.14fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white lg:p-10">
          <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(135deg,rgba(15,107,255,0.45),rgba(16,185,129,0.16),transparent)]" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              <Sparkles className="h-3.5 w-3.5" />
              Create workspace
            </p>
            <h1 className="mt-5 max-w-sm text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">
              Start your organization workspace.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/70">
              Create your company account, choose the dashboard theme, and
              invite your team into a private security ID workspace.
            </p>
          </div>

          <div className="relative mt-10 grid gap-3 text-sm text-white/75">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              Your users, staff records, ID cards, alerts, and audit logs stay
              inside your organization.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              Your selected theme is saved to the workspace and follows every
              admin page after login.
            </div>
          </div>
        </section>

        <section className="bg-[#f8fafc] p-5 sm:p-8 lg:p-10">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                Create your workspace
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This creates the owner login and saves the organization theme.
              </p>
            </div>
            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400"
            >
              Login
            </Link>
          </div>

          <OnboardingForm initialPlan={initialPlan} />
        </section>
      </div>
    </main>
  )
}
