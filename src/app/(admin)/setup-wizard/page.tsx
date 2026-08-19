'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, FastForward, RotateCcw, Wand2 } from 'lucide-react'

const STEP_META: Record<string, { title: string; desc: string; href: string }> = {
  brand: { title: 'Brand workspace', desc: 'Upload logo, favicon, and support details.', href: '/settings' },
  package: { title: 'Choose package', desc: 'Pick the plan that matches users and staff volume.', href: '/billing' },
  invite: { title: 'Invite team', desc: 'Invite admins, HR, and managers.', href: '/users/invite' },
  staff: { title: 'Add staff', desc: 'Create or import your first staff records.', href: '/v2/staff' },
  id_template: { title: 'Design ID card', desc: 'Set the card layout, colors, and visible fields.', href: '/id-card-designer' },
  domains: { title: 'Add custom domain', desc: 'Prepare branded login or verification domains.', href: '/custom-domains' },
  automations: { title: 'Create automation', desc: 'Notify the team when documents need attention.', href: '/automations' },
  security: { title: 'Secure workspace', desc: 'Enable 2FA and review security center settings.', href: '/security-center' },
}

type Step = { key: string; done: boolean }

export default function SetupWizardPage() {
  const [steps, setSteps] = useState<Step[]>([])
  const [state, setState] = useState<Record<string, boolean>>({})
  const [skipped, setSkipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/onboarding-wizard')
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to load setup wizard.')
    else {
      setSteps(result.steps || [])
      setState(result.state || {})
      setSkipped(Boolean(result.skipped))
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const completed = steps.filter((step) => step.done).length
  const percent = steps.length ? Math.round((completed / steps.length) * 100) : 0
  const nextStep = useMemo(() => steps.find((step) => !step.done), [steps])

  const markDone = async (key: string) => {
    const nextState = { ...state, [key]: true }
    setState(nextState)
    setSteps((prev) => prev.map((step) => step.key === key ? { ...step, done: true } : step))
    await fetch('/api/admin/onboarding-wizard', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: nextState }),
    })
  }

  const setWizardSkipped = async (value: boolean) => {
    const nextState = { ...state }
    if (value) nextState.__wizard_skipped = true
    else delete nextState.__wizard_skipped
    setSkipped(value)
    setState(nextState)
    await fetch('/api/admin/onboarding-wizard', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: nextState, action: value ? 'skip' : 'resume' }),
    })
  }

  if (loading) return <Panel>Loading setup wizard...</Panel>
  if (error) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Wand2 className="h-5 w-5" /></div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Admin Setup Wizard</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">A guided setup path for the features that make this workspace production-ready.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Progress</p>
              <p className="mt-1 text-2xl font-black">{percent}%</p>
            </div>
            <button
              onClick={() => setWizardSkipped(!skipped)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              {skipped ? <RotateCcw className="h-4 w-4" /> : <FastForward className="h-4 w-4" />}
              {skipped ? 'Resume wizard' : 'Skip for now'}
            </button>
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-950" style={{ width: `${percent}%` }} />
        </div>
      </section>

      {skipped ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700/70">Skipped</p>
              <h2 className="mt-2 text-2xl font-black">Setup wizard is hidden from the daily flow.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/70">
                Admins can keep using the app. Resume this wizard when they are ready to finish branding, users, IDs, security, and launch checks.
              </p>
            </div>
            <button onClick={() => setWizardSkipped(false)} className="rounded-2xl bg-amber-900 px-5 py-3 text-sm font-black text-white">
              Resume setup
            </button>
          </div>
        </section>
      ) : null}

      {nextStep ? (
        <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Recommended next</p>
          <h2 className="mt-2 text-2xl font-black">{STEP_META[nextStep.key]?.title}</h2>
          <p className="mt-2 text-sm text-white/65">{STEP_META[nextStep.key]?.desc}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={STEP_META[nextStep.key]?.href || '/dashboard'} className="inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Open step</Link>
            <button onClick={() => markDone(nextStep.key)} className="inline-flex rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white">
              Mark complete
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => {
          const meta = STEP_META[step.key]
          return (
            <article key={step.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  {step.done ? <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" /> : <Circle className="mt-1 h-5 w-5 text-slate-300" />}
                  <div>
                    <h3 className="font-black text-slate-950">{meta?.title || step.key}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{meta?.desc}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {step.done ? 'Done' : 'Open'}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={meta?.href || '/dashboard'} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">Open</Link>
                {!step.done ? <button onClick={() => markDone(step.key)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">Mark done</button> : null}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}
