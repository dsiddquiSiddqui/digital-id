'use client'

import Link from 'next/link'
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError('')
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/change-password` })
    setLoading(false)
    if (resetError) { setError('We could not start password recovery. Please wait a moment and try again.'); return }
    setSent(true)
  }
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white"><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center"><section className="w-full rounded-[30px] border border-white/10 bg-[#f8fafc] p-8 text-slate-950 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-10"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white"><ShieldCheck className="h-7 w-7" /></span><p className="mt-7 text-xs font-black uppercase tracking-[.18em] text-slate-400">Portal recovery</p><h1 className="mt-3 text-3xl font-black">Reset your password</h1><p className="mt-3 text-sm leading-6 text-slate-600">Enter your portal email. If it belongs to an account, we will send a secure recovery link.</p>{sent ? <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.</div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Email address</span><span className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-slate-950"><Mail className="h-5 w-5 text-slate-400" /><input autoFocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@platform.com" className="w-full bg-transparent px-3 outline-none" /></span></label>{error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}<button disabled={loading} className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-60">{loading ? 'Sending…' : 'Send recovery link'}</button></form>}<Link href="/portal/login" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Back to portal login</Link></section></div></main>
}
