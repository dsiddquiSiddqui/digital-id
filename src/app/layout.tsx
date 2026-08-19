import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'Security ID Admin',
  description: 'Admin dashboard for guard digital IDs',
  icons: {
    icon: '/security-id-icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
