import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowUpRight,
  BadgeCheck,
  LockKeyhole,
  ScanLine,
} from 'lucide-react'
import { OnboardingForm } from './OnboardingForm'

const trustPoints = [
  { icon: LockKeyhole, label: 'Private by design', detail: 'Organization-scoped access' },
  { icon: ScanLine, label: 'Ready to verify', detail: 'Digital IDs and QR checks' },
  { icon: BadgeCheck, label: 'Built for control', detail: 'Roles, alerts, and audit trails' },
]

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#f0eee8] text-[#171915]">
      <div className="mx-auto min-h-screen max-w-[1600px] p-3 sm:p-5 lg:p-7">
        <div className="grid min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[26px] border border-black/10 bg-[#f8f6f0] shadow-[0_35px_90px_rgba(27,29,24,0.13)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="relative isolate overflow-hidden bg-[#171915] px-6 py-7 text-white sm:px-9 sm:py-9 lg:flex lg:flex-col lg:justify-between lg:px-11 lg:py-10">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
              <div className="absolute -right-24 top-28 h-72 w-72 rotate-45 border border-white/10" />
              <div className="absolute -right-8 top-44 h-72 w-72 rotate-45 border border-[#c8ff4d]/30" />
              <div className="absolute bottom-[-9rem] left-[-8rem] h-80 w-80 rounded-full bg-[#c8ff4d]/10 blur-3xl" />
              <span className="absolute right-5 top-12 text-[13rem] font-black leading-none tracking-[-0.12em] text-white/[0.025] sm:text-[18rem] lg:right-2 lg:top-24 lg:text-[22rem]">
                X
              </span>
            </div>

            <div>
              <Link href="/" className="inline-flex rounded-xl bg-white px-3 py-2.5" aria-label="Digital ID X home">
                <Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} priority className="h-auto w-[178px]" />
              </Link>

              <div className="mt-11 max-w-lg sm:mt-14 lg:mt-24">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#c8ff4d]">
                  <span className="h-px w-8 bg-[#c8ff4d]" />
                  Workspace launch
                </p>
                <h1 className="mt-5 max-w-md font-serif text-[2.85rem] font-semibold leading-[0.92] tracking-[-0.055em] sm:mt-6 sm:text-6xl lg:text-[4.6rem]">
                  Your identity operation starts here.
                </h1>
                <p className="mt-6 max-w-md text-sm font-medium leading-7 text-white/58 sm:text-base">
                  Set up the secure command centre for your people, credentials,
                  documents, and live verification.
                </p>
              </div>
            </div>

            <div className="mt-7 sm:mt-12 lg:mt-16">
              <div className="hidden gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {trustPoints.map(({ icon: Icon, label, detail }) => (
                  <div key={label} className="bg-[#1c1e19]/95 p-4 sm:p-5">
                    <Icon className="h-4 w-4 text-[#c8ff4d]" />
                    <p className="mt-4 text-xs font-black text-white">{label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/40">{detail}</p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-white/40">
                Already have a workspace?{' '}
                <Link href="/login" className="inline-flex items-center gap-1 font-bold text-white transition hover:text-[#c8ff4d]">
                  Sign in <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>
          </aside>

          <section className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10 xl:px-14">
            <div className="mx-auto max-w-4xl">
              <header className="flex flex-col gap-5 border-b border-[#d9d6ce] pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#73766d]">
                    New organization
                  </p>
                  <h2 className="mt-2 text-[1.75rem] font-black tracking-[-0.045em] sm:text-4xl">
                    Get started for free
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#666960]">
                  <span className="h-2 w-2 rounded-full bg-[#70a300]" />
                  No card required
                </div>
              </header>

              <OnboardingForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
