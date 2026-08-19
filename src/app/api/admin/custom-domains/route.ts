import { NextResponse } from 'next/server'
import { resolveCname, resolveTxt } from 'dns/promises'
import { ADMIN_ROLES, requireAdminAccess } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit'

const DOMAIN_PATTERN = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i

function normalizeDnsValue(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, '')
}

async function verifyDomainRecords(domain: string, target: string, token: string) {
  const errors: string[] = []
  const normalizedTarget = normalizeDnsValue(target)
  let cnameOk = false
  let txtOk = false

  try {
    const records = await resolveCname(domain)
    cnameOk = records.some((record) => normalizeDnsValue(record) === normalizedTarget)
    if (!cnameOk) errors.push(`CNAME must point to ${target}.`)
  } catch {
    errors.push('CNAME record was not found.')
  }

  try {
    const txtRecords = await resolveTxt(domain)
    const flatRecords = txtRecords.map((parts) => parts.join(''))
    txtOk = flatRecords.includes(`security-id-verification=${token}`)
    if (!txtOk) errors.push('TXT verification record was not found.')
  } catch {
    errors.push('TXT verification record was not found.')
  }

  return {
    cnameOk,
    txtOk,
    verified: cnameOk && txtOk,
    error: errors.join(' '),
  }
}

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const { data } = await result.access.adminSupabase
      .from('organization_domains')
      .select('*')
      .eq('organization_id', result.access.profile.organization_id!)
      .order('created_at', { ascending: false })

    return NextResponse.json({ domains: data || [] })
  } catch (error) {
    console.error('Domains load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const domain = typeof body.domain === 'string' ? body.domain.trim().toLowerCase() : ''
    const purpose = ['login', 'verification', 'both'].includes(body.purpose) ? body.purpose : 'login'

    if (!DOMAIN_PATTERN.test(domain)) return NextResponse.json({ error: 'Enter a valid domain.' }, { status: 400 })

    const { data, error } = await result.access.adminSupabase
      .from('organization_domains')
      .insert({
        organization_id: result.access.profile.organization_id,
        domain,
        purpose,
        dns_target: process.env.CUSTOM_DOMAIN_TARGET || 'security-id.app',
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAuditLog({
      access: result.access,
      action: 'custom_domain_added',
      entityType: 'organization_domain',
      entityId: data.id,
      module: 'Custom Domains',
      page: '/custom-domains',
      metadata: { domain, purpose },
    })

    return NextResponse.json({ domain: data })
  } catch (error) {
    console.error('Domain create error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)
    if (result.error || !result.access) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''

    if (body.action === 'verify') {
      const { data: current, error: currentError } = await result.access.adminSupabase
        .from('organization_domains')
        .select('*')
        .eq('id', id)
        .eq('organization_id', result.access.profile.organization_id!)
        .single()

      if (currentError || !current) {
        return NextResponse.json({ error: currentError?.message || 'Domain not found.' }, { status: 404 })
      }

      const check = await verifyDomainRecords(current.domain, current.dns_target, current.verification_token)
      const update = {
        status: check.verified ? 'verified' : 'pending',
        dns_status: check.verified ? 'verified' : 'failed',
        ssl_status: check.verified ? 'pending' : 'failed',
        cname_ok: check.cnameOk,
        txt_ok: check.txtOk,
        last_error: check.error || null,
        last_checked_at: new Date().toISOString(),
        verified_at: check.verified ? new Date().toISOString() : null,
      }

      const { data, error } = await result.access.adminSupabase
        .from('organization_domains')
        .update(update)
        .eq('id', id)
        .eq('organization_id', result.access.profile.organization_id!)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      await writeAuditLog({
        access: result.access,
        action: check.verified ? 'custom_domain_verified' : 'custom_domain_verification_failed',
        entityType: 'organization_domain',
        entityId: id,
        module: 'Custom Domains',
        page: '/custom-domains',
        metadata: { domain: current.domain, cname_ok: check.cnameOk, txt_ok: check.txtOk, error: check.error },
      })

      return NextResponse.json({ domain: data, check })
    }

    const status = body.status === 'disabled' ? 'disabled' : 'pending'

    const { data, error } = await result.access.adminSupabase
      .from('organization_domains')
      .update({ status })
      .eq('id', id)
      .eq('organization_id', result.access.profile.organization_id!)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ domain: data })
  } catch (error) {
    console.error('Domain update error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
