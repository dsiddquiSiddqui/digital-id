import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const baseUrl = 'https://security-id-system.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/signup`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/login`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/cookie-policy`, changeFrequency: 'yearly', priority: 0.3 },
  ]
  const { data } = await createAdminClient()
    .from('platform_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .eq('visibility', 'public')
  return [...pages, ...(data || []).map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: post.updated_at, changeFrequency: 'monthly' as const, priority: 0.7 }))]
}
