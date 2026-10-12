import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function getPost(slug: string) { const { data } = await createAdminClient().from('platform_posts').select('title, slug, excerpt, content, tags, seo_title, seo_description, published_at').eq('slug', slug).eq('status', 'published').eq('visibility', 'public').maybeSingle(); return data }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const post = await getPost(slug); return post ? { title: post.seo_title || `${post.title} | Digital ID X`, description: post.seo_description || post.excerpt || undefined } : {} }
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const post = await getPost(slug); if (!post) notFound(); return <main className="min-h-screen bg-[#f7f4ef] text-[#191919]"><article className="mx-auto max-w-3xl px-5 py-12 sm:px-7 lg:py-20"><Link href="/blog" className="inline-flex items-center gap-2 text-sm font-black text-[#615a52]"><ArrowLeft className="h-4 w-4" />All insights</Link>{post.tags?.length ? <p className="mt-10 text-xs font-black uppercase tracking-[.14em] text-[#697f44]">{post.tags.join(' · ')}</p> : null}<h1 className="mt-4 text-4xl font-black tracking-[-.045em] sm:text-6xl">{post.title}</h1>{post.excerpt ? <p className="mt-6 text-xl font-semibold leading-8 text-[#615a52]">{post.excerpt}</p> : null}<p className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#8a8379]"><CalendarDays className="h-4 w-4" />{post.published_at ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(post.published_at)) : 'Digital ID X'}</p><div className="mt-10 whitespace-pre-wrap rounded-xl border border-[#e0d8cf] bg-white p-6 text-base font-medium leading-8 text-[#403b35] shadow-[0_15px_40px_rgba(25,25,25,.05)] sm:p-10">{post.content}</div></article></main> }
