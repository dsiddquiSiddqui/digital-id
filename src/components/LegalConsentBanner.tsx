'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function LegalConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void Promise.resolve().then(() => {
      setVisible(window.localStorage.getItem('security-id-legal-accepted') !== '1')
    })
  }, [])

  const accept = async () => {
    setSaving(true)
    await fetch('/api/legal/accept', { method: 'POST' }).catch(() => null)
    window.localStorage.setItem('security-id-legal-accepted', '1')
    setVisible(false)
    setSaving(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-[0_20px_60px_rgba(15,23,42,0.18)] lg:left-auto lg:max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-6 text-slate-600">
          By continuing you accept the <Link className="font-bold text-slate-950 underline" href="/terms">Terms</Link>, <Link className="font-bold text-slate-950 underline" href="/privacy-policy">Privacy Policy</Link>, and <Link className="font-bold text-slate-950 underline" href="/cookie-policy">Cookie Policy</Link>.
        </p>
        <button onClick={accept} disabled={saving} className="shrink-0 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
          {saving ? 'Saving...' : 'Accept'}
        </button>
      </div>
    </div>
  )
}
