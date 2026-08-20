'use client'

import { useActionState, useState, useTransition, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  LockKeyhole,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  registerOrganization,
  validateAccountStep,
  validateWorkspaceStep,
  type OnboardingState,
} from './actions'

const initialState: OnboardingState = {}
const steps = [
  { number: 1, label: 'Your account' },
  { number: 2, label: 'Your workspace' },
  { number: 3, label: 'Ready to go' },
] as const

type StepNumber = (typeof steps)[number]['number']
type FormValues = {
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  organizationName: string
  phone: string
  teamSize: string
}

const initialValues: FormValues = {
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  organizationName: '',
  phone: '',
  teamSize: '2-10',
}

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(registerOrganization, initialState)
  const [step, setStep] = useState<StepNumber>(1)
  const [values, setValues] = useState<FormValues>(initialValues)
  const [clientError, setClientError] = useState('')
  const [isChecking, startChecking] = useTransition()

  const updateValue = (name: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
    setClientError('')
  }

  const continueFromAccount = () => {
    if (!values.ownerName.trim() || !values.ownerEmail.trim() || !values.ownerPassword) {
      setClientError('Add your name, work email, and password to continue.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(values.ownerEmail)) {
      setClientError('Enter a valid work email address.')
      return
    }

    if (values.ownerPassword.length < 8) {
      setClientError('Password must be at least 8 characters long.')
      return
    }

    setClientError('')
    startChecking(async () => {
      try {
        const result = await validateAccountStep({
          ownerName: values.ownerName,
          ownerEmail: values.ownerEmail,
        })

        if (!result.ok) {
          setClientError(result.error || 'Unable to verify this account.')
          return
        }

        setStep(2)
      } catch {
        setClientError('Unable to verify this account. Please try again.')
      }
    })
  }

  const continueFromWorkspace = () => {
    if (!values.organizationName.trim()) {
      setClientError('Give your workspace a name to continue.')
      return
    }

    setClientError('')
    startChecking(async () => {
      try {
        const result = await validateWorkspaceStep({
          organizationName: values.organizationName,
        })

        if (!result.ok) {
          setClientError(result.error || 'Unable to verify this workspace.')
          return
        }

        setStep(3)
      } catch {
        setClientError('Unable to verify this workspace. Please try again.')
      }
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (step === 1) {
      event.preventDefault()
      continueFromAccount()
    } else if (step === 2) {
      event.preventDefault()
      continueFromWorkspace()
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="pt-7">
      <input type="hidden" name="ownerName" value={values.ownerName} />
      <input type="hidden" name="ownerEmail" value={values.ownerEmail} />
      <input type="hidden" name="ownerPassword" value={values.ownerPassword} />
      <input type="hidden" name="organizationName" value={values.organizationName} />
      <input type="hidden" name="phone" value={values.phone} />

      <ol className="grid grid-cols-3 gap-2" aria-label="Signup progress">
        {steps.map((item) => {
          const complete = item.number < step
          const active = item.number === step

          return (
            <li key={item.number} className="min-w-0">
              <div className={`h-1 rounded-full transition ${item.number <= step ? 'bg-[#171915]' : 'bg-[#d8d5cd]'}`} />
              <div className="mt-2 flex items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${active ? 'bg-[#c8ff4d] text-[#171915]' : complete ? 'bg-[#171915] text-white' : 'border border-[#c9c6bd] text-[#85887e]'}`}>
                  {complete ? <Check className="h-3 w-3" /> : item.number}
                </span>
                <span className={`truncate text-[10px] font-black uppercase tracking-[0.08em] ${active ? 'text-[#171915]' : 'text-[#8a8d83]'}`}>
                  {item.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-10">
        {step === 1 ? (
          <StepPanel
            eyebrow="Step 1 of 3"
            title="Create your account"
            description="One account gives you access to your Digital ID X workspace."
          >
            <div className="grid gap-4">
              <Field
                icon={<UserRound className="h-4 w-4" />}
                label="Full name"
                name="ownerNameEntry"
                value={values.ownerName}
                onChange={(value) => updateValue('ownerName', value)}
                placeholder="Your name"
                autoComplete="name"
              />
              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Work email"
                name="ownerEmailEntry"
                value={values.ownerEmail}
                onChange={(value) => updateValue('ownerEmail', value)}
                placeholder="you@company.com"
                type="email"
                autoComplete="email"
              />
              <Field
                icon={<LockKeyhole className="h-4 w-4" />}
                label="Password"
                name="ownerPasswordEntry"
                value={values.ownerPassword}
                onChange={(value) => updateValue('ownerPassword', value)}
                placeholder="At least 8 characters"
                type="password"
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <StepError message={clientError} />

            <button
              type="button"
              onClick={continueFromAccount}
              disabled={isChecking}
              className="group mt-7 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#171915] px-6 text-sm font-black text-white transition hover:bg-[#2b2e27] disabled:cursor-wait disabled:opacity-70"
            >
              {isChecking ? (
                <><LoaderCircle className="h-4 w-4 animate-spin" /> Checking account…</>
              ) : (
                <>
                  Continue
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8ff4d] text-[#171915] transition group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </>
              )}
            </button>
          </StepPanel>
        ) : null}

        {step === 2 ? (
          <StepPanel
            eyebrow="Step 2 of 3"
            title="Name your workspace"
            description="This is where your team will manage people, IDs, documents, and checks."
          >
            <div className="grid gap-4">
              <Field
                icon={<Building2 className="h-4 w-4" />}
                label="Workspace name"
                name="organizationNameEntry"
                value={values.organizationName}
                onChange={(value) => updateValue('organizationName', value)}
                placeholder="Acme Security Services"
                autoComplete="organization"
              />

              <div>
                <label htmlFor="signup-team-size" className="mb-2 block text-[11px] font-black uppercase tracking-[0.09em] text-[#5e6159]">
                  Team size
                </label>
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#d5d2ca] bg-white px-4 text-[#8a8d83] transition focus-within:border-[#171915] focus-within:ring-2 focus-within:ring-[#c8ff4d]/70">
                  <UsersRound className="h-4 w-4" />
                  <select
                    id="signup-team-size"
                    value={values.teamSize}
                    onChange={(event) => updateValue('teamSize', event.target.value)}
                    className="w-full cursor-pointer bg-transparent py-3 text-sm font-semibold text-[#171915] outline-none"
                  >
                    <option value="just-me">Just me</option>
                    <option value="2-10">2–10 people</option>
                    <option value="11-50">11–50 people</option>
                    <option value="51-200">51–200 people</option>
                    <option value="201+">201+ people</option>
                  </select>
                </div>
              </div>

              <Field
                icon={<Phone className="h-4 w-4" />}
                label="Phone number"
                hint="Optional"
                name="phoneEntry"
                value={values.phone}
                onChange={(value) => updateValue('phone', value)}
                placeholder="+44 7000 000000"
                type="tel"
                autoComplete="tel"
              />
            </div>

            <StepError message={clientError} />

            <StepNavigation
              onBack={() => setStep(1)}
              onContinue={continueFromWorkspace}
              checking={isChecking}
            />
          </StepPanel>
        ) : null}

        {step === 3 ? (
          <StepPanel
            eyebrow="Step 3 of 3"
            title="Your workspace is ready"
            description="Start free. Add teammates, branding, and billing from the guided setup after launch."
          >
            <div className="overflow-hidden rounded-2xl border border-[#d8d5cd] bg-white">
              <div className="flex items-center gap-4 border-b border-[#e2dfd7] p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#171915] text-[#c8ff4d]">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-[#171915]">{values.organizationName}</p>
                  <p className="mt-1 truncate text-xs text-[#7c7f75]">Owner · {values.ownerEmail}</p>
                </div>
              </div>
              <div className="grid gap-px bg-[#e2dfd7] sm:grid-cols-3">
                <LaunchItem icon={<CheckCircle2 className="h-4 w-4" />} label="Free workspace" />
                <LaunchItem icon={<ShieldCheck className="h-4 w-4" />} label="Secure by default" />
                <LaunchItem icon={<Sparkles className="h-4 w-4" />} label="Guided setup next" />
              </div>
            </div>

            {state.error ? <StepError message={state.error} /> : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={pending}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-[#5f6259] transition hover:bg-[#eeece5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={pending}
                className="group inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#171915] px-6 text-sm font-black text-white shadow-[0_15px_30px_rgba(23,25,21,0.16)] transition hover:-translate-y-0.5 hover:bg-[#2b2e27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Creating workspace…' : 'Launch Digital ID X'}
                {!pending ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8ff4d] text-[#171915] transition group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                ) : null}
              </button>
            </div>

            <p className="mt-5 text-center text-[11px] leading-5 text-[#7c7f75]">
              By launching, you agree to our{' '}
              <a href="/terms" className="font-bold text-[#171915] underline underline-offset-2">terms</a>
              {' '}and{' '}
              <a href="/privacy-policy" className="font-bold text-[#171915] underline underline-offset-2">privacy policy</a>.
            </p>
          </StepPanel>
        ) : null}
      </div>
    </form>
  )
}

function StepPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="mx-auto max-w-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#81847a]">{eyebrow}</p>
      <h3 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#171915] sm:text-4xl">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#73766d]">{description}</p>
      <div className="mt-7">{children}</div>
    </section>
  )
}

function Field({
  icon,
  label,
  hint,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  minLength,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  name: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  autoComplete?: string
  minLength?: number
}) {
  const id = `signup-${name}`

  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.09em] text-[#5e6159]">
        <span>{label}</span>
        {hint ? <span className="font-semibold normal-case tracking-normal text-[#96988f]">{hint}</span> : null}
      </label>
      <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#d5d2ca] bg-white px-4 text-[#8a8d83] transition focus-within:border-[#171915] focus-within:ring-2 focus-within:ring-[#c8ff4d]/70">
        {icon}
        <input
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-sm font-semibold text-[#171915] outline-none placeholder:font-medium placeholder:text-[#aaa99f]"
        />
      </div>
    </div>
  )
}

function StepNavigation({
  onBack,
  onContinue,
  checking,
}: {
  onBack: () => void
  onContinue: () => void
  checking: boolean
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={checking}
        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-[#5f6259] transition hover:bg-[#eeece5] disabled:cursor-wait disabled:opacity-60"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={checking}
        className="group inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#171915] px-6 text-sm font-black text-white transition hover:bg-[#2b2e27] disabled:cursor-wait disabled:opacity-70"
      >
        {checking ? (
          <><LoaderCircle className="h-4 w-4 animate-spin" /> Checking workspace…</>
        ) : (
          <>
            Continue
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8ff4d] text-[#171915] transition group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </>
        )}
      </button>
    </div>
  )
}

function StepError({ message }: { message: string }) {
  if (!message) return null

  return (
    <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </p>
  )
}

function LaunchItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-[#f3f1eb] px-4 py-3 text-[11px] font-black text-[#4f524a]">
      <span className="text-[#4f6f08]">{icon}</span>
      {label}
    </div>
  )
}
