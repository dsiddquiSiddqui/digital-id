import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const statuses = ['draft', 'pending_review', 'scheduled', 'published', 'archived']
const visibilities = ['public', 'portal']
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160)

async function requireEditor() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, role, platform_role, is_active, full_name, email, organization_id').eq('auth_user_id', user.id).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false || !['owner', 'administrator'].includes(profile.platform_role || 'administrator')) return null
  return { profile }
}

export async function GET() {
  const access = await requireEditor(); if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const admin = createAdminClient()
  const [{ data, error }, { data: revisions }] = await Promise.all([admin.from('platform_posts').select('*').order('updated_at', { ascending: false }), admin.from('platform_post_revisions').select('id, post_id, revision_number, created_at, snapshot').order('created_at', { ascending: false }).limit(250)])
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ posts: data || [], revisions: revisions || [] })
}

export async function POST(request: Request) {
  const access = await requireEditor(); if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const body = await request.json(); const title = text(body.title, 180) || ''; const slug = slugify(text(body.slug, 180) || title)
  if (title.length < 3 || !slug) return NextResponse.json({ error: 'A title of at least 3 characters is required.' }, { status: 400 })
  const status = statuses.includes(body.status) ? body.status : 'draft'; const admin = createAdminClient(); const record = values(body, title, slug, status)
  const { data, error } = await admin.from('platform_posts').insert({ ...record, author_profile_id: access.profile.id, approved_by: status === 'published' ? access.profile.id : null, approved_at: status === 'published' ? new Date().toISOString() : null, published_at: status === 'published' ? new Date().toISOString() : null }).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That URL slug is already in use.' : error.message }, { status: 400 })
  await saveRevision(admin, data, access.profile.id); await audit(admin, access.profile, 'platform_post_created', data.id, { title, status })
  return NextResponse.json({ post: data })
}

export async function PATCH(request: Request) {
  const access = await requireEditor(); if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const body = await request.json(); if (typeof body.id !== 'string' || body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Post and explicit confirmation are required.' }, { status: 400 })
  const admin = createAdminClient(); const { data: current } = await admin.from('platform_posts').select('*').eq('id', body.id).maybeSingle(); if (!current) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  const title = text(body.title, 180) || ''; const slug = slugify(text(body.slug, 180) || title); const status = statuses.includes(body.status) ? body.status : current.status
  if (title.length < 3 || !slug) return NextResponse.json({ error: 'A title of at least 3 characters is required.' }, { status: 400 })
  if (status === 'scheduled' && !validFuture(body.scheduled_for)) return NextResponse.json({ error: 'Choose a future publishing date for scheduled posts.' }, { status: 400 })
  const approval = status === 'published' && current.status !== 'published' ? { approved_by: access.profile.id, approved_at: new Date().toISOString(), published_at: new Date().toISOString() } : {}
  const { data, error } = await admin.from('platform_posts').update({ ...values(body, title, slug, status), ...approval, updated_at: new Date().toISOString() }).eq('id', body.id).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That URL slug is already in use.' : error.message }, { status: 400 })
  await saveRevision(admin, data, access.profile.id); await audit(admin, access.profile, 'platform_post_updated', data.id, { title, status, revision_created: true })
  return NextResponse.json({ post: data })
}

function values(body: Record<string, unknown>, title: string, slug: string, status: string) { return { title, slug, content: text(body.content, 100000) || '', excerpt: text(body.excerpt, 500), cover_image_url: text(body.cover_image_url, 1000), og_image_url: text(body.og_image_url, 1000), category: text(body.category, 80), author_name: text(body.author_name, 120), status, visibility: visibilities.includes(body.visibility as string) ? body.visibility : 'public', tags: Array.isArray(body.tags) ? body.tags.map(String).map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 12) : [], seo_title: text(body.seo_title, 180), seo_description: text(body.seo_description, 320), scheduled_for: status === 'scheduled' ? text(body.scheduled_for, 100) : null } }
function text(value: unknown, max: number) { return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null }
function validFuture(value: unknown) { const date = typeof value === 'string' ? new Date(value) : null; return Boolean(date && !Number.isNaN(date.getTime()) && date.getTime() > Date.now()) }
async function saveRevision(admin: ReturnType<typeof createAdminClient>, post: Record<string, unknown>, profileId: string) { const { count } = await admin.from('platform_post_revisions').select('*', { count: 'exact', head: true }).eq('post_id', post.id); await admin.from('platform_post_revisions').insert({ post_id: post.id, revision_number: (count || 0) + 1, snapshot: post, created_by: profileId }) }
async function audit(admin: ReturnType<typeof createAdminClient>, profile: { id: string; full_name: string | null; email: string | null }, action: string, id: string, metadata: Record<string, unknown>) { await admin.from('audit_logs').insert({ actor_profile_id: profile.id, action_type: action, entity_type: 'platform_post', entity_id: id, metadata: { ...metadata, actor_name: profile.full_name, actor_email: profile.email, module: 'Posts', page: '/portal/posts' } }) }
