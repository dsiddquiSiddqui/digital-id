import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Insights',
  description: 'Practical guidance on secure staff identity, compliance, and digital ID operations.',
  alternates: { canonical: '/blog' },
}

export default async function BlogPage() {
  const { data } = await createAdminClient()
    .from('platform_posts')
    .select('id, title, slug, excerpt, cover_image_url, tags, published_at')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })
  const posts = data || []

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#191919]">
      <PublicHeader />
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-7 lg:py-20">
        <p className="text-sm font-black uppercase tracking-[.16em] text-[#7c756c]">Insights and updates</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-.05em] sm:text-7xl">Better identity operations, explained clearly.</h1>
        <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-[#615a52]">Practical guidance for teams managing people, documents, access, and trusted digital IDs.</p>
        {posts.length ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article key={post.id} className="flex flex-col rounded-xl border border-[#e0d8cf] bg-white p-6 shadow-[0_12px_35px_rgba(25,25,25,.05)]">
                {post.tags?.length ? <p className="text-xs font-black uppercase tracking-[.12em] text-[#697f44]">{post.tags.slice(0, 3).join(' · ')}</p> : null}
                <h2 className="mt-3 text-2xl font-black tracking-[-.03em]">{post.title}</h2>
                <p className="mt-3 flex-1 text-sm font-semibold leading-7 text-[#615a52]">{post.excerpt || 'Read the latest from Digital ID X.'}</p>
                <div className="mt-6 flex items-center justify-between border-t border-[#eee8df] pt-4">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[#8a8379]"><CalendarDays className="h-4 w-4" />{post.published_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(post.published_at)) : 'New'}</span>
                  <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-black">Read <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="mt-12 rounded-xl border border-dashed border-[#d8d0c7] bg-white p-12 text-center"><h2 className="text-xl font-black">New articles are being prepared</h2><p className="mt-2 text-sm font-semibold text-[#756e65]">Please check back soon.</p></div>}
      </section>
      <PublicFooter />
    </main>
  )
}
