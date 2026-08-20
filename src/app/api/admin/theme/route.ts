import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ORGANIZATION_THEMES } from '@/lib/saas-themes'

const ADMIN_ROLES = ['super_admin', 'admin']
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function PATCH(request: Request) {
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

    if (
      !currentProfile?.organization_id ||
      !ADMIN_ROLES.includes(currentProfile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await request.json()
    const themeKey = textValue(body.theme_key)
    const primaryColor = textValue(body.primary_color)
    const accentColor = textValue(body.accent_color)
    const surfaceColor = textValue(body.surface_color)

    if (!ORGANIZATION_THEMES.some((theme) => theme.key === themeKey)) {
      return NextResponse.json({ error: 'Choose a valid theme preset.' }, { status: 400 })
    }

    for (const [label, value] of [
      ['Primary color', primaryColor],
      ['Navigation color', accentColor],
      ['Canvas color', surfaceColor],
    ] as const) {
      if (!HEX_COLOR_PATTERN.test(value)) {
        return NextResponse.json(
          { error: `${label} must be a six-digit hex color.` },
          { status: 400 }
        )
      }
    }

    const { data: organization, error: updateError } = await adminSupabase
      .from('organizations')
      .update({
        theme_key: themeKey,
        primary_color: primaryColor,
        accent_color: accentColor,
        surface_color: surfaceColor,
      })
      .eq('id', currentProfile.organization_id)
      .select('id, theme_key, primary_color, accent_color, surface_color')
      .single()

    if (updateError || !organization) {
      return NextResponse.json(
        { error: updateError?.message || 'Unable to save the workspace theme.' },
        { status: 400 }
      )
    }

    await adminSupabase.from('audit_logs').insert({
      organization_id: currentProfile.organization_id,
      actor_profile_id: currentProfile.id,
      action_type: 'organization_theme_updated',
      entity_type: 'organization',
      entity_id: currentProfile.organization_id,
      metadata: {
        actor_name: currentProfile.full_name || user.email || 'Unknown user',
        actor_email: currentProfile.email || user.email || null,
        actor_role: currentProfile.role,
        module: 'Appearance',
        page: 'workspace_header',
        changes: organization,
      },
    })

    return NextResponse.json({ success: true, organization })
  } catch (error) {
    console.error('Organization theme update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
