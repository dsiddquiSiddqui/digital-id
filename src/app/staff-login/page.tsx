'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import logo from '@/assets/SGC-Security-Tag-White-Inverse-Logo.svg'
import loogo from '@/assets/SGC-Security-Tag-Logo.svg'
import { createClient } from '@/lib/supabase/client'

type StaffProfile = {
  id: string
  auth_user_id: string
  role: string
  full_name: string
  email: string
  is_active: boolean
}

export default function staffLoginPage() {
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
      .select('id, auth_user_id, role, full_name, email, is_active')
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

    // 🔥 IMPORTANT FIX FOR WEBVIEW
    await new Promise((res) => setTimeout(res, 500))

    router.replace('/my-id')
  } catch (err: any) {
    console.error('Login error:', err)
    setError('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}

  return (
    <main className="relative min-h-screen overflow-hidden ">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,148,224,0.08),transparent_35%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200  shadow-[0_25px_70px_rgba(15,23,42,0.08)] lg:grid-cols-2">
          {/* Left side */}
          <section className="hidden  px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="">
                <Image
                  src={logo}
                  alt="SGC Security"
                  className="h-auto w-[320px] object-contain"
                  priority
                />
              </div>

              <div className="mt-6 max-w-sm">
                <span className="inline-flex rounded-full bg-[#0094e0]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7dd3fc]">
                  Staff Access
                </span>

                <h1 className="mt-5 text-4xl font-bold leading-tight">
                  Secure Staff Login
                </h1>

                <p className="mt-4 text-sm leading-7 text-white/70">
                  Access your digital ID securely and verify your active Staff profile.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <MiniPill text="Staff only" />
              <MiniPill text="QR verified" />
            </div>
          </section>

          {/* Right side */}
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
                  Staff Login
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to view your digital Staff ID.
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
                      placeholder="staff@email.com"
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
                  className="w-full rounded-2xl bg-[#0094e0] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#007bb8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Logging in...' : 'Login to My ID'}
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