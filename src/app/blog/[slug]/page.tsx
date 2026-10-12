import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function getPost(slug: string) { const { data } = await createAdminClient().from('platform_posts').select('id, title, slug, excerpt, content, tags, category, author_name, seo_title, seo_description, og_image_url, published_at').eq('slug', slug).eq('status', 'published').eq('visibility', 'public').maybeSingle(); return data }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const post = await getPost(slug); if (!post) return {}; const title = post.seo_title || `${post.title} | Digital ID X`; const description = post.seo_description || post.excerpt || undefined; return { title, description, openGraph: { title, description, type: 'article', publishedTime: post.published_at || undefined, images: post.og_image_url ? [{ url: post.og_image_url }] : undefined } } }
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = await getPost(slug); if (!post) notFound()
  const requestHeaders = await headers(); const referrer = requestHeaders.get('referer'); let referrerHost: string | null = null
  try { referrerHost = referrer ? new URL(referrer).hostname.slice(0, 180) : null } catch { referrerHost = null }
  const admin = createAdminClient(); await Promise.all([admin.from('platform_post_events').insert({ post_id: post.id, event_type: 'view', referrer_host: referrerHost }), admin.from('platform_posts').update({ view_count: Number((await admin.from('platform_posts').select('view_count').eq('id', post.id).single()).data?.view_count || 0) + 1 }).eq('id', post.id)])
  return <main className="min-h-screen bg-[#f7f4ef] text-[#191919]"><article className="mx-auto max-w-3xl px-5 py-12 sm:px-7 lg:py-20"><Link href="/blog" className="inline-flex items-center gap-2 text-sm font-black text-[#615a52]"><ArrowLeft className="h-4 w-4" />All insights</Link><p className="mt-10 text-xs font-black uppercase tracking-[.14em] text-[#697f44]">{[post.category, ...(post.tags || [])].filter(Boolean).join(' · ')}</p><h1 className="mt-4 text-4xl font-black tracking-[-.045em] sm:text-6xl">{post.title}</h1>{post.excerpt ? <p className="mt-6 text-xl font-semibold leading-8 text-[#615a52]">{post.excerpt}</p> : null}<div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-[#8a8379]"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{post.published_at ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(post.published_at)) : 'Digital ID X'}</span>{post.author_name ? <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" />{post.author_name}</span> : null}</div><div className="mt-10 whitespace-pre-wrap rounded-xl border border-[#e0d8cf] bg-white p-6 text-base font-medium leading-8 text-[#403b35] shadow-[0_15px_40px_rgba(25,25,25,.05)] sm:p-10">{post.content}</div></article></main>
}
