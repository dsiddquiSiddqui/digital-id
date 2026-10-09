'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
      .select('id, auth_user_id, role, is_active, force_password_change, organization_id, organizations:organizations(status, require_2fa)')
      .eq('auth_user_id', user.id)
      .single<Profile>()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      setError('Access denied. No account profile was found.')
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

    if (organization?.require_2fa) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance?.nextLevel === 'aal2' && assurance?.currentLevel !== 'aal2') {
        router.replace(`/mfa?next=${isStaff ? '/my-id' : '/dashboard'}`)
        return
      }
    }

    await fetch('/api/session/activity', { method: 'POST' }).catch(() => null)

    router.replace(isStaff ? '/my-id' : '/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] px-5 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] lg:grid-cols-[0.94fr_1.06fr]">
          <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex h-14 w-16 items-center justify-center rounded-2xl bg-white p-2">
                <Image src="/digital-id-x-icon.png" alt="" width={165} height={134} priority className="h-auto w-full" />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-white/45">
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

          <section className="bg-[#f8fafc] px-6 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} priority className="mb-6 h-auto w-[210px]" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Secure account access</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use your work email. We will take you to the correct workspace.
                </p>
                {createdWorkspace ? (
                  <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
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
                  <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-slate-950">
                    <LockKeyhole className="h-5 w-5 text-slate-400" />
                    <input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-transparent px-3 py-3.5 text-slate-900 outline-none placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="cursor-pointer text-slate-500 transition hover:text-slate-800"
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
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Finding your workspace…' : 'Continue securely'}
                  {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                New organization?{' '}
                <a href="/signup" className="font-bold text-slate-950 hover:underline">
                  Create workspace
                </a>
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
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-slate-950">
        {icon}
        <input
          id={id}
          name={type === 'email' ? 'email' : id}
          autoComplete={type === 'email' ? 'email' : undefined}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3.5 text-slate-900 outline-none placeholder:text-slate-400"
          required
        />
      </div>
    </div>
  )
}

function MiniPill({ text }: { text: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-sm">
      {text}
    </div>
  )
}
