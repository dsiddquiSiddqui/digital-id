import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) { return publish(request) }
export async function POST(request: Request) { return publish(request) }

async function publish(request: Request) {
  const expected = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.headers.get('x-cron-secret')
  if (expected && supplied !== expected) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  // Platform posts are intentionally global and have no organization_id tenant owner.
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await admin.from('platform_posts').update({ status: 'published', published_at: now, updated_at: now }).eq('status', 'scheduled').lte('scheduled_for', now).select('id, title')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ published: data?.length || 0, posts: data || [] })
}
