import { NextResponse } from 'next/server'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'

const WIZARD_STEPS = [
  'brand',
  'package',
  'invite',
  'staff',
  'id_template',
  'domains',
  'automations',
  'security',
]

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const [{ data: organization }, staffCount, domainCount, ruleCount] = await Promise.all([
      result.access.adminSupabase
        .from('organizations')
        .select('logo_url, plan, id_card_template, onboarding_wizard_state, require_2fa')
        .eq('id', result.access.profile.organization_id!)
        .single(),
      result.access.adminSupabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', result.access.profile.organization_id!),
      result.access.adminSupabase
        .from('organization_domains')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', result.access.profile.organization_id!),
      result.access.adminSupabase
        .from('workflow_automation_rules')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', result.access.profile.organization_id!),
    ])

    const auto = {
      brand: Boolean(organization?.logo_url),
      package: Boolean(organization?.plan && organization.plan !== 'free'),
      staff: Boolean((staffCount.count || 0) > 0),
      id_template: Boolean(organization?.id_card_template),
      domains: Boolean((domainCount.count || 0) > 0),
      automations: Boolean((ruleCount.count || 0) > 0),
      security: Boolean(organization?.require_2fa),
    }

    const manual = organization?.onboarding_wizard_state || {}
    const steps = WIZARD_STEPS.map((key) => ({
      key,
      done: Boolean(auto[key as keyof typeof auto] || manual[key]),
    }))

    return NextResponse.json({
      steps,
      state: manual,
      skipped: Boolean(manual.__wizard_skipped),
    })
  } catch (error) {
    console.error('Onboarding wizard load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const state = body.state && typeof body.state === 'object' ? body.state : {}
    if (body.action === 'skip') state.__wizard_skipped = true
    if (body.action === 'resume') delete state.__wizard_skipped

    const { data, error } = await result.access.adminSupabase
      .from('organizations')
      .update({ onboarding_wizard_state: state })
      .eq('id', result.access.profile.organization_id!)
      .select('onboarding_wizard_state')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ state: data?.onboarding_wizard_state || state })
  } catch (error) {
    console.error('Onboarding wizard save error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
