import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  metadataBase: new URL('https://security-id-system.vercel.app'),
  title: { default: 'Digital ID X | Secure Staff Identity Workspace', template: '%s | Digital ID X' },
  description: 'Create verifiable staff ID cards, track workforce documents and manage expiry dates in one secure UK-focused workspace.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Digital ID X', title: 'Digital ID X | Secure Staff Identity Workspace', description: 'Create verifiable staff ID cards, track workforce documents and manage expiry dates in one secure workspace.', url: '/' },
  icons: {
    icon: '/digital-id-x-icon.png',
    apple: '/digital-id-x-icon.png',
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
