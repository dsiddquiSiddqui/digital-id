'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'

const navigation = [
  { label: 'Product', href: '/#product' },
  { label: 'Teams', href: '/#teams' },
  { label: 'Packages', href: '/#packages' },
  { label: 'Security', href: '/#security' },
  { label: 'Insights', href: '/blog' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-[#e8e2da] bg-[#fbfaf8]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-7">
        <Link href="/" aria-label="Digital ID X home" className="flex items-center">
          <Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} priority className="h-auto w-[164px] sm:w-[184px]" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navigation.map((item) => <Link key={item.label} href={item.href} className="rounded-md px-3 py-2 text-[15px] font-semibold text-[#4d4a45] transition hover:bg-[#f1eee9] hover:text-[#191919]">{item.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-md px-3 py-2 text-[15px] font-bold text-[#4d4a45] transition hover:bg-[#f1eee9] sm:inline-flex">Log in</Link>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-[#191919] px-4 py-2 text-[15px] font-black text-white transition hover:bg-black">Get started <ArrowRight className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d8d0c7] bg-white md:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open ? <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-[#e8e2da] bg-[#fbfaf8] px-5 py-4 md:hidden"><div className="mx-auto grid max-w-7xl gap-1">{navigation.map((item) => <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-bold text-[#4d4a45] hover:bg-[#f1eee9]">{item.label}</Link>)}<Link href="/login" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-bold text-[#4d4a45] hover:bg-[#f1eee9] sm:hidden">Log in</Link></div></nav> : null}
    </header>
  )
}
