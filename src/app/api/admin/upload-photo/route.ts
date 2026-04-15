import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const file = await req.blob()
    const filename = req.headers.get('x-filename')

    if (!file || !filename) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.storage
      .from('guard-photos')
      .upload(filename, file, {
        contentType: file.type,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: publicUrl } = supabase.storage
      .from('guard-photos')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch (err) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}