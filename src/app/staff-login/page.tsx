'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type StaffProfile = {
  id: string
  organization_id: string | null
  auth_user_id: string
  role: string
  full_name: string
  email: string
  is_active: boolean
  organizations?: {
    status: string
    require_2fa?: boolean
  } | Array<{
    status: string
    require_2fa?: boolean
  }> | null
}

export default function StaffLoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (loginError) {
      setError(loginError.message)
      return
    }

    const user = data.user

    if (!user) {
      setError('Login failed. User not found.')
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, auth_user_id, role, full_name, email, is_active, organizations:organizations(status, require_2fa)')
      .eq('auth_user_id', user.id)
      .single<StaffProfile>()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      setError('Access denied. No staff profile found.')
      return
    }

    if (profile.role !== 'staff') {
      await supabase.auth.signOut()
      setError('Access denied. This login is only for staff.')
      return
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      setError('Your staff account is inactive. Please contact admin.')
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
      setError('This organization is not active. Please contact your admin.')
      return
    }

    // 🔥 IMPORTANT FIX FOR WEBVIEW
    if (organization?.require_2fa) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance?.nextLevel === 'aal2' && assurance?.currentLevel !== 'aal2') {
        router.replace('/mfa?next=/my-id')
        return
      }
    }

    await fetch('/api/session/activity', { method: 'POST' }).catch(() => null)

    await new Promise((res) => setTimeout(res, 500))

    router.replace('/my-id')
  } catch (err) {
    console.error('Login error:', err)
    setError('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
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

              <div className="mt-6 max-w-sm">
                <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                  Staff Access
                </span>

                <h1 className="mt-5 text-4xl font-black leading-tight">
                  Open your digital staff ID.
                </h1>

                <p className="mt-4 text-sm leading-7 text-white/70">
                  Staff can sign in to view their current ID, documents, and
                  account settings in a protected portal.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <MiniPill text="Staff only" />
              <MiniPill text="QR verified" />
            </div>
          </section>

          <section className="bg-[#f8fafc] px-6 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} priority className="mb-6 h-auto w-[210px]" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Staff portal</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  Staff Login
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to view your digital Staff ID.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="staff-login-email" className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-slate-950">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <input
                      id="staff-login-email"
                      name="email"
                      autoComplete="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@email.com"
                      className="w-full bg-transparent px-3 py-3.5 text-slate-900 outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="staff-login-password" className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-slate-950">
                    <LockKeyhole className="h-5 w-5 text-slate-400" />
                    <input
                      id="staff-login-password"
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
                      className="text-slate-500 transition hover:text-slate-800"
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Logging in...' : 'Login to My ID'}
                  {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </form>
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
