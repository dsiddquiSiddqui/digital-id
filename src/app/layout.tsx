import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'Digital ID X',
  description: 'Digital ID X workspace for staff identities, documents, and verification',
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
