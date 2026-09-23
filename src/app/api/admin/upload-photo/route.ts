import { randomUUID } from 'node:crypto'
import { ADMIN_ROLES, MANAGER_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { buildTenantUploadPath, getUploadCategory } from '@/lib/storage-path'
import { NextResponse } from 'next/server'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'application/pdf',
]

export async function POST(req: Request) {
  try {
    const result = await requireAdminAccess(MANAGER_ROLES)
    if (!result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { adminSupabase: supabase, profile } = result.access

    const file = await req.blob()
    const filename = req.headers.get('x-filename')
    const visibility =
      req.headers.get('x-file-visibility') === 'private' ? 'private' : 'public'

    if (!file || !filename) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const category = getUploadCategory(filename)
    if (category === 'branding' && !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Only administrators can upload branding assets.' }, { status: 403 })
    }

    const bucket = category === 'branding' ? 'brand-assets' : 'guard-photos'

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is larger than 8MB.' }, { status: 400 })
    }

    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type is not allowed.' }, { status: 400 })
    }

    const storagePath = buildTenantUploadPath(
      profile.organization_id!,
      filename,
      randomUUID(),
    )

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    await supabase.from('file_assets').upsert(
      {
        organization_id: profile.organization_id,
        uploaded_by: profile.id,
        bucket,
        path: data.path,
        public_url: publicUrl.publicUrl,
        content_type: file.type || null,
        size_bytes: file.size,
        purpose: category === 'branding' ? 'branding' : 'staff_upload',
        visibility,
      },
      { onConflict: 'bucket,path' }
    )

    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
