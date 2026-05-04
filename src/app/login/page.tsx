'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import logo from '@/assets/SGC-Security-Tag-White-Inverse-Logo.svg'
import loogo from '@/assets/SGC-Security-Tag-Logo.svg'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  auth_user_id: string
  role: string
  is_active?: boolean
}

const ALLOWED_ADMIN_SIDE_ROLES = [
  'super_admin',
  'admin',
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
      .select('id, auth_user_id, role, is_active')
      .eq('auth_user_id', user.id)
      .single<Profile>()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      setError('Access denied. No admin profile found.')
      setLoading(false)
      return
    }

    if (!ALLOWED_ADMIN_SIDE_ROLES.includes(profile.role as (typeof ALLOWED_ADMIN_SIDE_ROLES)[number])) {
      await supabase.auth.signOut()
      setError('Access denied. Staff must use the staff login page.')
      setLoading(false)
      return
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut()
      setError('Your account is inactive. Please contact support.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="relative min-h-screen overflow-hidden ">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,148,224,0.08),transparent_35%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200  shadow-[0_25px_70px_rgba(15,23,42,0.08)] lg:grid-cols-2">
          <section className="hidden  px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="">
                <Image
                  src={logo}
                  alt="SGC Security"
                  className="h-auto w-[270px] object-contain"
                  priority
                />
              </div>

              <div className=" max-w-sm">
                <span className="inline-flex rounded-full bg-[#0094e0]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7dd3fc]">
                  Secure Access
                </span>

                <h1 className="mt-5 text-4xl font-bold leading-tight">
                  Secure Dashboard Login
                </h1>

                <p className="mt-4 text-sm leading-7 text-white/70">
                  Access your dashboard securely with role-based access control.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <MiniPill text="Role protected" />
                <MiniPill text="Secure access" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">Staff member?</p>
                <p className="mt-1 text-sm text-white/70">
                  If you are trying to access your staff dashboard, use the staff
                  login page.
                </p>

                <Link
                  href="/staff-login"
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Go to Staff Login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="px-6 py-8 sm:px-10 sm:py-12 bg-white">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex flex-col items-center text-center lg:hidden">
                <div className="">
                  <Image
                    src={loogo}
                    alt="SGC Security"
                    className="h-auto w-[250px] object-contain"
                    priority
                  />
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0094e0]/10">
                  <ShieldCheck className="h-7 w-7 text-[#0094e0]" />
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Dashboard Login
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to continue to the dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-[#0094e0]">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full bg-transparent px-3 py-3.5 text-slate-900 outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-[#0094e0]">
                    <LockKeyhole className="h-5 w-5 text-slate-400" />
                    <input
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
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
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
                  className="w-full cursor-pointer rounded-2xl bg-[#0094e0] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#007bb8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Login to Dashboard'}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:hidden">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <UserRound className="h-5 w-5 text-slate-700" />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Staff Dashboard
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Staff members should use the dedicated staff login page.
                    </p>

                    <Link
                      href="/staff-login"
                      className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      Go to Staff Login
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function MiniPill({ text }: { text: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-sm">
      {text}
    </div>
  )
}