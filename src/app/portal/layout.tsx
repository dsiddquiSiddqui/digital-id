'use client'

import { usePathname } from 'next/navigation'
import { PortalProvider } from '@/components/portal/PortalProvider'
import { PortalShell } from '@/components/portal/PortalShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/portal/login') return children
  return <PortalProvider><PortalShell>{children}</PortalShell></PortalProvider>
}
