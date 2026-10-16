'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  auth_user_id: string
  role: string
  platform_role?: string | null
  is_active?: boolean
  force_password_change?: boolean
  organization_id?: string | null
  organizations?: {
    status: string
    require_2fa?: boolean
  } | Array<{
    status: string
    require_2fa?: boolean
  }> | null
}

const ALLOWED_ADMIN_SIDE_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'operation_manager',
  'operation_team',
  'hr_manager',
  'hr',
] as const

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdWorkspace, setCreatedWorkspace] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('created') === '1') {
      window.setTimeout(() => {
        setCreatedWorkspace(params.get('workspace') || 'workspace')
      }, 0)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    const user = data.user

    if (!user) {
      setError('Login failed. User not found.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, role, platform_role, is_active, force_password_change, organization_id, organizations:organizations!profiles_organization_id_fkey(status, require_2fa)')
      .eq('auth_user_id', user.id)
      .single<Profile>()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      setError(
        profileError
          ? 'We could not load your account profile. Please try again or contact support.'
          : 'Access denied. No account profile was found.'
      )
      setLoading(false)
      return
    }

    const isStaff = profile.role === 'staff'
    const isSystemUser = ALLOWED_ADMIN_SIDE_ROLES.includes(
      profile.role as (typeof ALLOWED_ADMIN_SIDE_ROLES)[number]
    )

    if (!isStaff && !isSystemUser) {
      await supabase.auth.signOut()
      setError('Access denied. This account does not have a supported role.')
      setLoading(false)
      return
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut()
      setError('Your account is inactive. Please contact support.')
      setLoading(false)
      return
    }

    const organization = Array.isArray(profile.organizations)
      ? profile.organizations[0] ?? null
      : profile.organizations ?? null

    if (
      profile.organization_id &&
      organization &&
      !['active', 'trialing'].includes(organization.status)
    ) {
      await supabase.auth.signOut()
      setError('This organization is not active. Please contact platform support.')
      setLoading(false)
      return
    }

    if (profile.force_password_change) {
      router.replace('/change-password')
      return
    }

    const destination = isStaff
      ? '/my-id'
      : profile.role === 'super_admin' && !profile.organization_id
        ? '/portal/dashboard'
        : '/dashboard'

    if (organization?.require_2fa) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance?.nextLevel === 'aal2' && assurance?.currentLevel !== 'aal2') {
        router.replace(`/mfa?next=${encodeURIComponent(destination)}`)
        return
      }
    }

    await fetch('/api/session/activity', { method: 'POST' }).catch(() => null)

    router.replace(destination)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f0eee8] px-3 py-3 text-[#171915] sm:px-5 sm:py-5 lg:px-7 lg:py-7">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-[26px] border border-black/10 bg-[#f8f6f0] shadow-[0_35px_90px_rgba(27,29,24,0.13)] lg:grid-cols-[0.94fr_1.06fr]">
          <section className="relative isolate hidden overflow-hidden bg-[#171915] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
              <div className="absolute -right-24 top-24 h-72 w-72 rotate-45 border border-white/10" />
              <div className="absolute -right-8 top-40 h-72 w-72 rotate-45 border border-[#dcebc9]/25" />
              <div className="absolute bottom-[-9rem] left-[-8rem] h-80 w-80 rounded-full bg-[#dcebc9]/10 blur-3xl" />
              <span className="absolute right-3 top-20 text-[22rem] font-black leading-none tracking-[-0.12em] text-white/[0.025]">X</span>
            </div>
            <div>
              <div className="flex h-14 w-16 items-center justify-center rounded-2xl bg-white p-2">
                <Image src="/digital-id-x-icon.png" alt="" width={165} height={134} priority className="h-auto w-full" />
              </div>
              <p className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#dcebc9]">
                <span className="h-px w-8 bg-[#dcebc9]" />
                Smart workspace access
              </p>
              <h1 className="mt-4 max-w-sm text-4xl font-black leading-tight">
                One sign-in. The right workspace, automatically.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
                Digital ID X securely recognises your account type and opens
                either your staff ID or your organisation workspace.
              </p>
            </div>

            <div className="grid gap-3">
              <MiniPill text="Staff and system users" />
              <MiniPill text="Automatic role routing" />
              <MiniPill text="Organisation protected" />
            </div>
          </section>

          <section className="bg-[#f8f6f0] px-6 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} priority className="mb-6 h-auto w-[210px]" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#73766d]">Secure account access</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#171915]">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#73766d]">
                  Use your work email. We will take you to the correct workspace.
                </p>
                {createdWorkspace ? (
                  <p className="mt-4 rounded-xl border border-[#cadbb9] bg-[#edf5e5] px-4 py-3 text-sm font-semibold text-[#496629]">
                    Workspace created for {createdWorkspace}. Sign in with the
                    owner account to continue.
                  </p>
                ) : null}
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <LoginField
                  id="login-email"
                  icon={<Mail className="h-5 w-5 text-slate-400" />}
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@company.com"
                />

                <div>
                  <label htmlFor="login-password" className="mb-2 block text-[11px] font-black uppercase tracking-[0.09em] text-[#5e6159]">
                    Password
                  </label>
                  <div className="flex min-h-12 items-center rounded-xl border border-[#d5d2ca] bg-white px-4 text-[#8a8d83] transition focus-within:border-[#171915] focus-within:ring-2 focus-within:ring-[#dcebc9]">
                    <LockKeyhole className="h-5 w-5" />
                    <input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-transparent px-3 py-3.5 font-semibold text-[#171915] outline-none placeholder:font-medium placeholder:text-[#aaa99f]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="cursor-pointer text-[#777a71] transition hover:text-[#171915]"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#171915] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#2b2e27] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Finding your workspace…' : 'Continue securely'}
                  {!loading ? <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#dcebc9] text-[#171915] transition group-hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></span> : null}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#73766d]">
                New organization?{' '}
                <Link href="/signup" className="font-black text-[#171915] underline-offset-4 hover:underline">
                  Create workspace
                </Link>
              </p>
            </div>
          </section>
      </div>
      </div>
    </main>
  )
}

function LoginField({
  id,
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  id: string
  icon: React.ReactNode
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[11px] font-black uppercase tracking-[0.09em] text-[#5e6159]">
        {label}
      </label>
      <div className="flex min-h-12 items-center rounded-xl border border-[#d5d2ca] bg-white px-4 text-[#8a8d83] transition focus-within:border-[#171915] focus-within:ring-2 focus-within:ring-[#dcebc9]">
        {icon}
        <input
          id={id}
          name={type === 'email' ? 'email' : id}
          autoComplete={type === 'email' ? 'email' : undefined}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3.5 font-semibold text-[#171915] outline-none placeholder:font-medium placeholder:text-[#aaa99f]"
          required
        />
      </div>
    </div>
  )
}

function MiniPill({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-white/75 backdrop-blur-sm">
      {text}
    </div>
  )
}
