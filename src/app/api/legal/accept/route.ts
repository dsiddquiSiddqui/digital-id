import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found.' }, { status: 400 })
    }

    const { data: organization } = await adminSupabase
      .from('organizations')
      .select('legal_terms_version, legal_privacy_version')
      .eq('id', profile.organization_id)
      .single()

    const headersList = await headers()

    await adminSupabase.from('legal_acceptances').insert({
      organization_id: profile.organization_id,
      profile_id: profile.id,
      terms_version: organization?.legal_terms_version || '2026-06-25',
      privacy_version: organization?.legal_privacy_version || '2026-06-25',
      accepted_ip: headersList.get('x-forwarded-for') || null,
      user_agent: headersList.get('user-agent') || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Legal acceptance error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
