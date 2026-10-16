import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/blog/', '/terms', '/privacy-policy', '/cookie-policy'],
      disallow: ['/api/', '/portal/', '/dashboard', '/settings', '/users', '/v2/', '/staff', '/my-id'],
    },
    sitemap: 'https://security-id-system.vercel.app/sitemap.xml',
    host: 'https://security-id-system.vercel.app',
  }
}
