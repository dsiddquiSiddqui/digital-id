'use client'

import { useActionState } from 'react'
import { useState } from 'react'
import { BadgeDollarSign, Building2, Check, LockKeyhole, Mail, Palette, Phone, UserRound } from 'lucide-react'
import {
  ORGANIZATION_THEMES,
  type ThemeKey,
} from '@/lib/saas-themes'
import { BILLING_PLANS, formatPlanLimit, type BillingPlanKey } from '@/lib/billing-plans'
import {
  registerOrganization,
  type OnboardingState,
} from './actions'

const initialState: OnboardingState = {}

export function OnboardingForm({ initialPlan = 'free' }: { initialPlan?: string }) {
  const [state, formAction, pending] = useActionState(
    registerOrganization,
    initialState
  )
  const [selectedPlan, setSelectedPlan] = useState(initialPlan)

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          icon={<Building2 className="h-4 w-4" />}
          label="Organization"
          name="organizationName"
          placeholder="Acme Security Services"
          required
        />
        <Field
          icon={<UserRound className="h-4 w-4" />}
          label="Owner name"
          name="ownerName"
          placeholder="Faraz Ahmed"
          required
        />
        <Field
          icon={<Mail className="h-4 w-4" />}
          label="Owner email"
          name="ownerEmail"
          placeholder="admin@company.com"
          type="email"
          required
        />
        <Field
          icon={<Phone className="h-4 w-4" />}
          label="Phone"
          name="phone"
          placeholder="+44 7000 000000"
        />
        <Field
          icon={<LockKeyhole className="h-4 w-4" />}
          label="Password"
          name="ownerPassword"
          placeholder="Minimum 8 characters"
          type="password"
          required
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Select theme</h2>
            <p className="text-xs text-slate-500">
              This becomes the default brand color set for the dashboard.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {ORGANIZATION_THEMES.map((theme, index) => (
            <ThemeOption
              key={theme.key}
              themeKey={theme.key}
              name={theme.name}
              description={theme.description}
              primaryColor={theme.primaryColor}
              accentColor={theme.accentColor}
              surfaceColor={theme.surfaceColor}
              defaultChecked={index === 0}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <BadgeDollarSign className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Select package</h2>
            <p className="text-xs text-slate-500">
              You can change the package later from the platform portal.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {BILLING_PLANS.map((plan) => (
            <PlanOption
              key={plan.key}
              planKey={plan.key}
              name={plan.name}
              price={plan.monthlyPrice}
              userLimit={plan.userLimit}
              staffLimit={plan.staffLimit}
              checked={plan.key === selectedPlan}
              onChange={setSelectedPlan}
            />
          ))}
        </div>
      </section>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-[0_20px_40px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Creating workspace...' : 'Create SaaS workspace'}
      </button>
    </form>
  )
}

function PlanOption({
  planKey,
  name,
  price,
  userLimit,
  staffLimit,
  checked,
  onChange,
}: {
  planKey: BillingPlanKey
  name: string
  price: number | null
  userLimit: number | null
  staffLimit: number | null
  checked: boolean
  onChange: (planKey: string) => void
}) {
  return (
    <label className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400">
      <input
        className="peer sr-only"
        type="radio"
        name="planKey"
        value={planKey}
        checked={checked}
        onChange={() => onChange(planKey)}
      />
      <span className="absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white peer-checked:flex">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="block text-sm font-black text-slate-950">{name}</span>
      <span className="mt-2 block text-2xl font-black text-slate-950">
        {price === null ? 'Custom' : `£${price}`}
        {price !== null ? <span className="text-xs font-bold text-slate-400"> /mo</span> : null}
      </span>
      <span className="mt-3 block text-xs font-semibold text-slate-500">
        {formatPlanLimit(userLimit, 'users')}
      </span>
      <span className="mt-1 block text-xs font-semibold text-slate-500">
        {formatPlanLimit(staffLimit, 'staff')}
      </span>
    </label>
  )
}

function Field({
  icon,
  label,
  name,
  placeholder,
  type = 'text',
  required = false,
}: {
  icon: React.ReactNode
  label: string
  name: string
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="grid gap-2 text-sm font-semibold text-slate-700">
      <label htmlFor={`signup-${name}`}>{label}</label>
      <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-400 shadow-sm transition focus-within:border-slate-950">
        {icon}
        <input
          id={`signup-${name}`}
          name={name}
          type={type}
          autoComplete={name === 'email' ? 'email' : name === 'password' ? 'new-password' : name === 'fullName' ? 'name' : name === 'organizationName' ? 'organization' : undefined}
          required={required}
          placeholder={placeholder}
          className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400"
        />
      </span>
    </div>
  )
}

function ThemeOption({
  themeKey,
  name,
  description,
  primaryColor,
  accentColor,
  surfaceColor,
  defaultChecked,
}: {
  themeKey: ThemeKey
  name: string
  description: string
  primaryColor: string
  accentColor: string
  surfaceColor: string
  defaultChecked?: boolean
}) {
  return (
    <label className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400">
      <input
        className="peer sr-only"
        type="radio"
        name="themeKey"
        value={themeKey}
        defaultChecked={defaultChecked}
      />
      <span className="absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white peer-checked:flex">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span
        className="block rounded-xl border border-slate-200 p-3"
        style={{ backgroundColor: surfaceColor }}
      >
        <span className="flex gap-2">
          <span
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
          <span
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="h-8 flex-1 rounded-full bg-white/80" />
        </span>
      </span>
      <span className="mt-3 block text-sm font-bold text-slate-950">{name}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">
        {description}
      </span>
    </label>
  )
}
