import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization selected.' }, { status: 400 })
    }

    const { data: asset } = await adminSupabase
      .from('file_assets')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!asset) return NextResponse.json({ error: 'File not found.' }, { status: 404 })

    if (asset.visibility === 'public' && asset.public_url) {
      return NextResponse.json({ url: asset.public_url, signed: false })
    }

    const { data, error } = await adminSupabase.storage
      .from(asset.bucket)
      .createSignedUrl(asset.path, 60 * 10)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'Unable to create signed URL.' }, { status: 400 })
    }

    await adminSupabase.from('audit_logs').insert({
      organization_id: profile.organization_id,
      actor_profile_id: profile.id,
      action_type: 'file_signed_url_created',
      entity_type: 'file_asset',
      entity_id: asset.id,
      metadata: {
        bucket: asset.bucket,
        path: asset.path,
        module: 'Files',
        page: '/files',
      },
    })

    return NextResponse.json({ url: data.signedUrl, signed: true, expires_in: 600 })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
