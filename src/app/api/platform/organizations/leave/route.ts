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

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, organization_id, role, full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentProfile || currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const previousOrganizationId = currentProfile.organization_id

    await adminSupabase
      .from('profiles')
      .update({ organization_id: null })
      .eq('id', currentProfile.id)

    if (previousOrganizationId) {
      await adminSupabase
        .from('platform_access_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('organization_id', previousOrganizationId)
        .eq('super_admin_profile_id', currentProfile.id)
        .eq('status', 'active')

      await adminSupabase.from('audit_logs').insert({
        organization_id: previousOrganizationId,
        actor_profile_id: currentProfile.id,
        action_type: 'platform_workspace_left',
        entity_type: 'organization',
        entity_id: previousOrganizationId,
        metadata: {
          actor_name: currentProfile.full_name || user.email || 'Platform admin',
          actor_email: currentProfile.email || user.email || null,
          actor_role: currentProfile.role,
          module: 'Admin Shell',
          page: '/platform/organizations',
        },
      })
    }

    return NextResponse.json({
      success: true,
      redirect_to: '/platform/organizations',
    })
  } catch (error) {
    console.error('Platform leave organization error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
