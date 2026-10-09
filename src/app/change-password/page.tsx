'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); if (password.length < 12) return setError('Use at least 12 characters.'); if (password !== confirm) return setError('Passwords do not match.'); setSaving(true); const supabase = createClient(); const { error: passwordError } = await supabase.auth.updateUser({ password }); if (passwordError) { setError(passwordError.message); setSaving(false); return }; const response = await fetch('/api/account/password-changed', { method: 'POST' }); const result = await response.json(); if (!response.ok) { setError(result.error || 'Password changed, but account status could not be updated.'); setSaving(false); return }; router.replace(result.redirect_to || '/dashboard'); router.refresh() }
  return <main className="flex min-h-screen items-center justify-center bg-[#eef1eb] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-[28px] border border-black/10 bg-white p-7 shadow-[0_30px_90px_rgba(15,23,42,.14)]"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#152019] text-[#b8f43d]"><KeyRound className="h-5 w-5" /></span><p className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-[#66814a]">Security required</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Create your password</h1><p className="mt-3 text-sm leading-6 text-[#718078]">Your temporary password cannot be used again. Choose a unique password with at least 12 characters.</p><label className="mt-6 block text-xs font-black">New password<input autoFocus required minLength={12} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#f7f8f5] px-3 text-sm outline-none focus:border-[#78924e]" /></label><label className="mt-4 block text-xs font-black">Confirm password<input required minLength={12} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#f7f8f5] px-3 text-sm outline-none focus:border-[#78924e]" /></label>{error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}<button disabled={saving} className="mt-6 h-12 w-full rounded-xl bg-[#152019] text-sm font-black text-white disabled:opacity-50">{saving ? 'Securing account…' : 'Set password and continue'}</button></form></main>
}
