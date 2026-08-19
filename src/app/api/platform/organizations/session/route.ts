import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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
      .select('id, role, organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin' || !profile.organization_id) {
      return NextResponse.json({ active: false })
    }

    const { data: session } = await adminSupabase
      .from('platform_access_sessions')
      .select('id, reason, expires_at, status')
      .eq('organization_id', profile.organization_id)
      .eq('super_admin_profile_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session || new Date(session.expires_at) < new Date()) {
      if (session) {
        await adminSupabase
          .from('platform_access_sessions')
          .update({ status: 'expired', ended_at: new Date().toISOString() })
          .eq('id', session.id)
      }

      await adminSupabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', profile.id)

      return NextResponse.json({ active: false, expired: true, redirect_to: '/platform/organizations' })
    }

    return NextResponse.json({ active: true, session })
  } catch (error) {
    console.error('Platform session error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
