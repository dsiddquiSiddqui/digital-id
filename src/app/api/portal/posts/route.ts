import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const statuses = ['draft', 'published', 'archived']
const visibilities = ['public', 'portal']
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160)

async function requireEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, role, platform_role, is_active, full_name, email, organization_id').eq('auth_user_id', user.id).is('organization_id', null).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false || !['owner', 'administrator'].includes(profile.platform_role || 'administrator')) return null
  return { user, profile }
}

export async function GET() {
  const access = await requireEditor()
  if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { data, error } = await createAdminClient().from('platform_posts').select('*').order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ posts: data || [] })
}

export async function POST(request: Request) {
  const access = await requireEditor()
  if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const slug = slugify(typeof body.slug === 'string' && body.slug.trim() ? body.slug : title)
  if (title.length < 3 || !slug) return NextResponse.json({ error: 'A title of at least 3 characters is required.' }, { status: 400 })
  const status = statuses.includes(body.status) ? body.status : 'draft'
  const admin = createAdminClient()
  const { data, error } = await admin.from('platform_posts').insert({ title, slug, content, excerpt: clean(body.excerpt, 500), cover_image_url: clean(body.cover_image_url, 1000), status, visibility: visibilities.includes(body.visibility) ? body.visibility : 'public', tags: tags(body.tags), seo_title: clean(body.seo_title, 180), seo_description: clean(body.seo_description, 320), author_profile_id: access.profile.id, published_at: status === 'published' ? new Date().toISOString() : null }).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That URL slug is already in use.' : error.message }, { status: 400 })
  await audit(admin, access.profile, 'platform_post_created', data.id, { title, status })
  return NextResponse.json({ post: data })
}

export async function PATCH(request: Request) {
  const access = await requireEditor()
  if (!access) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const body = await request.json()
  if (typeof body.id !== 'string' || body.confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Post and explicit confirmation are required.' }, { status: 400 })
  const admin = createAdminClient()
  const { data: current } = await admin.from('platform_posts').select('id, status').eq('id', body.id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const slug = slugify(typeof body.slug === 'string' && body.slug.trim() ? body.slug : title)
  if (title.length < 3 || !slug) return NextResponse.json({ error: 'A title of at least 3 characters is required.' }, { status: 400 })
  const status = statuses.includes(body.status) ? body.status : current.status
  const update = { title, slug, content: typeof body.content === 'string' ? body.content.trim() : '', excerpt: clean(body.excerpt, 500), cover_image_url: clean(body.cover_image_url, 1000), status, visibility: visibilities.includes(body.visibility) ? body.visibility : 'public', tags: tags(body.tags), seo_title: clean(body.seo_title, 180), seo_description: clean(body.seo_description, 320), published_at: status === 'published' ? (current.status === 'published' ? undefined : new Date().toISOString()) : null, updated_at: new Date().toISOString() }
  const { data, error } = await admin.from('platform_posts').update(update).eq('id', body.id).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That URL slug is already in use.' : error.message }, { status: 400 })
  await audit(admin, access.profile, 'platform_post_updated', data.id, { title, status })
  return NextResponse.json({ post: data })
}

function clean(value: unknown, max: number) { return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null }
function tags(value: unknown) { return Array.isArray(value) ? value.map(String).map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 12) : [] }
async function audit(admin: ReturnType<typeof createAdminClient>, profile: { id: string; full_name: string | null; email: string | null }, action: string, id: string, metadata: Record<string, unknown>) { await admin.from('audit_logs').insert({ actor_profile_id: profile.id, action_type: action, entity_type: 'platform_post', entity_id: id, metadata: { ...metadata, actor_name: profile.full_name, actor_email: profile.email, module: 'Posts', page: '/portal/posts' } }) }
