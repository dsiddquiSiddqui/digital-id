'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type PortalProfile = {
  role: string
  is_active: boolean
}

export default function PortalLoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (loginError || !data.user) {
      setError(loginError?.message || 'Login failed.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('auth_user_id', data.user.id)
      .single<PortalProfile>()

    if (!profile || profile.role !== 'super_admin' || profile.is_active === false) {
      await supabase.auth.signOut()
      setError('Portal access denied.')
      setLoading(false)
      return
    }

    router.replace('/portal')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="hidden bg-slate-950 p-10 lg:block">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-white/40">
              Platform Portal
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-black leading-tight">
              Manage every organization from one private console.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
              This portal is not linked from the public website. Only platform
              users can access organization, revenue, package, and portal-user
              controls.
            </p>
          </section>

          <section className="bg-[#f8fafc] p-8 text-slate-950 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Direct portal access
                </p>
                <h2 className="mt-3 text-3xl font-black">Portal Login</h2>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Email
                  </span>
                  <span className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-slate-950">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      required
                      className="w-full bg-transparent px-3 outline-none"
                      placeholder="owner@platform.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Password
                  </span>
                  <span className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-slate-950">
                    <LockKeyhole className="h-5 w-5 text-slate-400" />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full bg-transparent px-3 outline-none"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-slate-500"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                </label>

                {error ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Enter portal'}
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
