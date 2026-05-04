import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security ID Admin',
  description: 'Admin dashboard for guard digital IDs',
  icons: {
    icon: '/favi.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}