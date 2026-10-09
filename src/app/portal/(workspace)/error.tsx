'use client'

import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

export default function PortalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <section className="mx-auto max-w-2xl rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-[0_18px_55px_rgba(20,31,24,0.08)]"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700"><AlertTriangle className="h-6 w-6" /></span><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-red-700">Portal recovery</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em]">This workspace view could not load</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#718078]">Your session and data are safe. Retry the request, or return to the operations overview if the problem continues.</p>{error.digest ? <p className="mt-3 font-mono text-xs text-[#718078]">Reference: {error.digest}</p> : null}<div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => unstable_retry()} className="inline-flex items-center gap-2 rounded-xl bg-[#152019] px-4 py-3 text-sm font-black text-white"><RotateCcw className="h-4 w-4" />Try again</button><Link href="/portal/dashboard" className="rounded-xl bg-[#eef1eb] px-4 py-3 text-sm font-black">Operations overview</Link></div></section>
}
