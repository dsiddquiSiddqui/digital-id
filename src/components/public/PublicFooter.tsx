import Image from 'next/image'
import Link from 'next/link'

const groups = [
  { title: 'Product', links: [['Features', '/#product'], ['Packages', '/#packages'], ['Security', '/#security'], ['Create workspace', '/signup']] },
  { title: 'Resources', links: [['Insights', '/blog'], ['Contact sales', 'mailto:sales@digitalidx.com?subject=Digital%20ID%20X'], ['Log in', '/login']] },
  { title: 'Legal', links: [['Privacy policy', '/privacy-policy'], ['Terms', '/terms'], ['Cookie policy', '/cookie-policy']] },
]

export function PublicFooter() {
  return (
    <footer className="border-t border-[#ddd6cd] bg-[#f2eee8]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-7 lg:grid-cols-[1.2fr_2fr]">
        <div><Image src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} className="h-auto w-[180px]" /><p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-[#686158]">Secure staff identities, current documents and verifiable workforce records in one controlled workspace.</p></div>
        <div className="grid gap-8 sm:grid-cols-3">{groups.map((group) => <div key={group.title}><p className="text-xs font-black uppercase tracking-[.14em] text-[#8a8379]">{group.title}</p><ul className="mt-4 space-y-3">{group.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm font-bold text-[#4d4a45] hover:text-black hover:underline">{label}</Link></li>)}</ul></div>)}</div>
      </div>
      <div className="border-t border-[#ddd6cd]"><p className="mx-auto max-w-7xl px-5 py-5 text-xs font-semibold text-[#8a8379] sm:px-7">© {new Date().getFullYear()} Digital ID X. Built for responsible workforce identity operations.</p></div>
    </footer>
  )
}
