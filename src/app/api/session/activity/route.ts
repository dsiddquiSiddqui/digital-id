import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ success: true, skipped: true })
    }

    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''

    await adminSupabase.from('session_activity').insert({
      organization_id: profile.organization_id,
      profile_id: profile.id,
      device_name: userAgent.slice(0, 120) || null,
      ip_address: headersList.get('x-forwarded-for') || null,
      user_agent: userAgent || null,
      last_seen_at: new Date().toISOString(),
    })

    await adminSupabase.from('audit_logs').insert({
      organization_id: profile.organization_id,
      actor_profile_id: profile.id,
      action_type: 'login_session_recorded',
      entity_type: 'profile',
      entity_id: profile.id,
      metadata: {
        user_agent: userAgent,
        module: 'Authentication',
        page: '/login',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session activity error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
