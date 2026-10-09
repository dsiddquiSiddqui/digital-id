import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile, error } = await admin.from('profiles').update({ force_password_change: false, locked_at: null, lock_reason: null }).eq('auth_user_id', user.id).select('id, organization_id, role').single()
  if (error || !profile) return NextResponse.json({ error: error?.message || 'Profile not found.' }, { status: 400 })
  await admin.from('audit_logs').insert({ organization_id: profile.organization_id, actor_profile_id: profile.id, action_type: 'required_password_changed', entity_type: 'profile', entity_id: profile.id, metadata: { module: 'Authentication', page: '/change-password' } })
  return NextResponse.json({ success: true, redirect_to: profile.role === 'staff' ? '/my-id' : '/dashboard' })
}
