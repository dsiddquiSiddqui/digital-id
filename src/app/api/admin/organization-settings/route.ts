import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getTheme } from '@/lib/saas-themes'

const ADMIN_ROLES = ['super_admin', 'admin']
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
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
      !currentProfile ||
      !currentProfile.organization_id ||
      !ADMIN_ROLES.includes(currentProfile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await request.json()
    const name = textValue(body.name)
    const requestedSlug = textValue(body.slug)
    const logoUrl = textValue(body.logo_url)
    const faviconUrl = textValue(body.favicon_url)
    const backgroundImageUrl = textValue(body.background_image_url)
    const supportEmail = textValue(body.support_email)
    const supportPhone = textValue(body.support_phone)
    const verificationTitle = textValue(body.verification_title)
    const themeKey = textValue(body.theme_key)
    const primaryColor = textValue(body.primary_color)
    const accentColor = textValue(body.accent_color)
    const surfaceColor = textValue(body.surface_color)

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required.' },
        { status: 400 }
      )
    }

    const slug = slugify(requestedSlug || name)

    if (!slug || !SLUG_PATTERN.test(slug)) {
      return NextResponse.json(
        { error: 'Workspace slug can only use lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      )
    }

    for (const [label, value] of [
      ['Primary color', primaryColor],
      ['Accent color', accentColor],
      ['Surface color', surfaceColor],
    ] as const) {
      if (!HEX_COLOR_PATTERN.test(value)) {
        return NextResponse.json(
          { error: `${label} must be a valid hex color like #0f6bff.` },
          { status: 400 }
        )
      }
    }

    const theme = getTheme(themeKey)

    const { data: existingSlugOwner } = await adminSupabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .neq('id', currentProfile.organization_id)
      .maybeSingle()

    if (existingSlugOwner) {
      return NextResponse.json(
        { error: 'That workspace slug is already in use.' },
        { status: 400 }
      )
    }

    const { data: updatedOrganization, error: updateError } = await adminSupabase
      .from('organizations')
      .update({
        name,
        slug,
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
        background_image_url: backgroundImageUrl || null,
        support_email: supportEmail || null,
        support_phone: supportPhone || null,
        verification_title: verificationTitle || null,
        theme_key: theme.key,
        primary_color: primaryColor,
        accent_color: accentColor,
        surface_color: surfaceColor,
      })
      .eq('id', currentProfile.organization_id)
      .select(
        'id, name, slug, status, plan, logo_url, favicon_url, background_image_url, support_email, support_phone, verification_title, theme_key, primary_color, accent_color, surface_color'
      )
      .single()

    if (updateError || !updatedOrganization) {
      return NextResponse.json(
        { error: updateError?.message || 'Unable to update organization settings.' },
        { status: 400 }
      )
    }

    await adminSupabase.from('audit_logs').insert({
      organization_id: currentProfile.organization_id,
      actor_profile_id: currentProfile.id,
      action_type: 'organization_settings_updated',
      entity_type: 'organization',
      entity_id: currentProfile.organization_id,
      metadata: {
        actor_name: currentProfile.full_name || user.email || 'Unknown user',
        actor_email: currentProfile.email || user.email || null,
        actor_role: currentProfile.role,
        module: 'Organization Settings',
        page: '/settings',
        changes: {
          name,
          slug,
          logo_url: logoUrl || null,
          favicon_url: faviconUrl || null,
          background_image_url: backgroundImageUrl || null,
          support_email: supportEmail || null,
          support_phone: supportPhone || null,
          verification_title: verificationTitle || null,
          theme_key: theme.key,
          primary_color: primaryColor,
          accent_color: accentColor,
          surface_color: surfaceColor,
        },
      },
    })

    return NextResponse.json({
      success: true,
      organization: updatedOrganization,
    })
  } catch (error) {
    console.error('Organization settings update error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
