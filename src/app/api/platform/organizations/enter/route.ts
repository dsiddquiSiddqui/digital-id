import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
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
      .select('id, role, full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentProfile || currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await request.json()
    const organizationId =
      typeof body.organization_id === 'string' ? body.organization_id : ''
    const reason =
      typeof body.reason === 'string' ? body.reason.trim() : ''

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required.' },
        { status: 400 }
      )
    }

    if (reason.length < 8) {
      return NextResponse.json(
        { error: 'Enter a reason of at least 8 characters.' },
        { status: 400 }
      )
    }

    const { data: organization } = await adminSupabase
      .from('organizations')
      .select('id, name, slug, status')
      .eq('id', organizationId)
      .maybeSingle()

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found.' },
        { status: 404 }
      )
    }

    await adminSupabase
      .from('profiles')
      .update({ organization_id: organization.id })
      .eq('id', currentProfile.id)

    await adminSupabase.from('platform_access_sessions').insert({
      organization_id: organization.id,
      super_admin_profile_id: currentProfile.id,
      reason,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })

    await adminSupabase.from('audit_logs').insert({
      organization_id: organization.id,
      actor_profile_id: currentProfile.id,
      action_type: 'platform_workspace_entered',
      entity_type: 'organization',
      entity_id: organization.id,
      metadata: {
        actor_name: currentProfile.full_name || user.email || 'Platform admin',
        actor_email: currentProfile.email || user.email || null,
        actor_role: currentProfile.role,
        organization_name: organization.name,
        organization_slug: organization.slug,
        reason,
        expires_in_minutes: 30,
        module: 'Platform Organizations',
        page: '/platform/organizations',
      },
    })

    return NextResponse.json({
      success: true,
      organization,
      redirect_to: '/dashboard',
    })
  } catch (error) {
    console.error('Platform enter organization error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
