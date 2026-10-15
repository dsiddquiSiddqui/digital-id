import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { data: profile } = await supabase.from('profiles').select('id, role, platform_role, is_active, organization_id').eq('auth_user_id', user.id).single()
  if (!profile || profile.role !== 'super_admin' || profile.is_active === false || !['owner', 'administrator'].includes(profile.platform_role || 'administrator')) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, or GIF image up to 5 MB.' }, { status: 400 })
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extension}`
  const admin = createAdminClient()
  const { error } = await admin.storage.from('post-media').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const { data } = admin.storage.from('post-media').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, path })
}
