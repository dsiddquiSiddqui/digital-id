'use client'

import { useEffect, useState } from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MfaPage() {
  return (
    <Suspense fallback={<MfaShell>Preparing secure challenge...</MfaShell>}>
      <MfaInner />
    </Suspense>
  )
}

function MfaInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setError('')
      const mfa = supabase.auth.mfa
      const { data: factorsData } = await mfa.listFactors()
      const verifiedFactor = factorsData?.totp?.find((factor) => factor.status === 'verified')

      if (verifiedFactor) {
        const { data, error: challengeError } = await mfa.challenge({ factorId: verifiedFactor.id })
        if (challengeError) setError(challengeError.message)
        else {
          setFactorId(verifiedFactor.id)
          setChallengeId(data.id)
        }
      } else {
        const { data, error: enrollError } = await mfa.enroll({ factorType: 'totp' })
        if (enrollError) setError(enrollError.message)
        else {
          setFactorId(data.id)
          setQr(data.totp.qr_code)
          const challenge = await mfa.challenge({ factorId: data.id })
          if (challenge.error) setError(challenge.error.message)
          else setChallengeId(challenge.data.id)
        }
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const verify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    })

    if (verifyError) {
      setError(verifyError.message)
      return
    }

    await fetch('/api/session/activity', { method: 'POST' }).catch(() => null)
    router.replace(next)
  }

  return (
    <MfaShell>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-slate-950 p-3 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Two-factor authentication</h1>
              <p className="mt-1 text-sm text-slate-500">Verify your authenticator code to continue.</p>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Preparing secure challenge...</p>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-5">
              {qr ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-bold text-slate-700">Scan this QR code in your authenticator app.</p>
                  <Image src={qr} alt="Authenticator QR code" width={192} height={192} unoptimized className="mx-auto h-48 w-48" />
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Authentication code</span>
                <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-lg font-black tracking-[0.2em] outline-none focus:border-slate-950" />
              </label>

              {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

              <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
                <LockKeyhole className="h-4 w-4" />
                Verify
              </button>
            </form>
          )}
    </MfaShell>
  )
}

function MfaShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f5f2] px-5 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          {children}
        </section>
      </div>
    </main>
  )
}
