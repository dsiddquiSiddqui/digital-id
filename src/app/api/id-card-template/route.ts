import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanIdCardTemplate } from '@/lib/id-card-template'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization is selected.' }, { status: 400 })
    }

    const { data: organization, error } = await createAdminClient()
      .from('organizations')
      .select('id_card_template, name, logo_url, primary_color, accent_color, surface_color')
      .eq('id', profile.organization_id)
      .single()

    if (error || !organization) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
    }

    return NextResponse.json({
      template: cleanIdCardTemplate(organization.id_card_template),
      organization: {
        name: organization.name,
        logo_url: organization.logo_url,
        primary_color: organization.primary_color,
        accent_color: organization.accent_color,
        surface_color: organization.surface_color,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unable to load the ID card design.' }, { status: 500 })
  }
}
