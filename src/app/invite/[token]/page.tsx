'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react'

type Invitation = {
  email: string
  full_name: string | null
  role: string
  organizations?: { name: string; slug: string; logo_url: string | null } | Array<{ name: string; slug: string; logo_url: string | null }> | null
}

function normalizeOrganization(organization: Invitation['organizations']) {
  return Array.isArray(organization) ? organization[0] ?? null : organization ?? null
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/invitations/${params.token}`)
        const result = await response.json()
        if (!response.ok) {
          setError(result.error || 'Invitation is not valid.')
          return
        }
        setInvitation(result.invitation)
        setFullName(result.invitation.full_name || '')
      } catch {
        setError('Unable to load invitation.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.token])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/invitations/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to accept invitation.')
        return
      }
      setSuccess(true)
      window.setTimeout(() => router.push(result.redirect_to || '/login'), 900)
    } catch {
      setError('Unable to accept invitation.')
    } finally {
      setSaving(false)
    }
  }

  const organization = normalizeOrganization(invitation?.organizations)

  return (
    <main className="min-h-screen bg-[#f6f5f2] px-5 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.10)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-slate-950 p-8 text-white">
            <div className="flex h-full flex-col justify-between gap-10">
              <div>
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
                  {organization?.logo_url ? (
                    <Image unoptimized src={organization.logo_url} alt="" width={56} height={56} className="h-full w-full object-cover" />
                  ) : (
                    <ShieldCheck className="h-7 w-7" />
                  )}
                </div>
                <h1 className="mt-6 text-3xl font-black tracking-tight">
                  Join {organization?.name || 'your workspace'}
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Accept your invitation and create a secure login for the Digital ID X admin portal.
                </p>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                Role: {invitation?.role?.replace(/_/g, ' ') || 'Loading'}
              </p>
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <p className="text-sm text-slate-500">Loading invitation...</p>
            ) : error && !invitation ? (
              <Panel tone="danger">{error}</Panel>
            ) : success ? (
              <Panel tone="success">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Account created. Redirecting to login...
                </span>
              </Panel>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Invited email
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950">{invitation?.email}</p>
                </div>

                <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Jane Smith" required />
                <Field label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" required />
                <Field label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" type="password" required />

                {error ? <Panel tone="danger">{error}</Panel> : null}

                <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                  <LockKeyhole className="h-4 w-4" />
                  {saving ? 'Creating account...' : 'Accept invitation'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
    </label>
  )
}

function Panel({ children, tone }: { children: React.ReactNode; tone: 'danger' | 'success' }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{children}</div>
}
