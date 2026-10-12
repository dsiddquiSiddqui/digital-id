'use client'

import { usePathname } from 'next/navigation'
import { PortalProvider } from '@/components/portal/PortalProvider'
import { PortalShell } from '@/components/portal/PortalShell'
import { PortalFeedbackProvider } from '@/components/portal/PortalFeedback'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/portal/login') return children
  return <PortalProvider><PortalFeedbackProvider><PortalShell>{children}</PortalShell></PortalFeedbackProvider></PortalProvider>
}
