import { NextResponse } from 'next/server'
import {
  actorMetadata,
  ADMIN_ROLES,
  requireAdminAccess,
} from '@/lib/admin-auth'
import { getOrganizationPlanUsage } from '@/lib/plan-usage'

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50)
}

export async function GET() {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const organizationId = result.access.profile.organization_id!
    const usage = await getOrganizationPlanUsage(result.access.adminSupabase, organizationId)

    const [{ data: sessions }, { count: rateLimitEvents }] = await Promise.all([
      result.access.adminSupabase
        .from('session_activity')
        .select('*')
        .eq('organization_id', organizationId)
        .order('last_seen_at', { ascending: false })
        .limit(20),
      result.access.adminSupabase
        .from('rate_limit_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
    ])

    return NextResponse.json({
      usage,
      sessions: sessions || [],
      rate_limit_events: rateLimitEvents || 0,
      settings: {
        require_2fa: Boolean(usage.organization?.require_2fa),
        device_tracking_enabled: usage.organization?.device_tracking_enabled !== false,
        rate_limit_enabled: usage.organization?.rate_limit_enabled !== false,
        session_history_enabled: usage.organization?.session_history_enabled !== false,
        session_timeout_minutes: usage.organization?.session_timeout_minutes || 480,
        ip_allowlist: usage.organization?.ip_allowlist || [],
        backup_policy: usage.organization?.backup_policy || { frequency: 'weekly', retention_days: 30 },
        compliance_policy: usage.organization?.compliance_policy || {
          require_document_approval: true,
          allow_staff_self_service: true,
          allow_staff_id_download: false,
        },
      },
    })
  } catch (error) {
    console.error('Security center load error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireAdminAccess(ADMIN_ROLES)

    if (result.error || !result.access) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const storageQuotaMb = Number(body.storage_quota_mb)
    const sessionTimeoutMinutes = Number(body.session_timeout_minutes)
    const update = {
      require_2fa: boolValue(body.require_2fa, false),
      device_tracking_enabled: boolValue(body.device_tracking_enabled, true),
      rate_limit_enabled: boolValue(body.rate_limit_enabled, true),
      session_history_enabled: boolValue(body.session_history_enabled, true),
      session_timeout_minutes:
        Number.isFinite(sessionTimeoutMinutes) && sessionTimeoutMinutes >= 15
          ? Math.min(10080, Math.round(sessionTimeoutMinutes))
          : 480,
      ip_allowlist: stringList(body.ip_allowlist),
      backup_policy: {
        frequency: ['daily', 'weekly', 'monthly'].includes(body.backup_policy?.frequency)
          ? body.backup_policy.frequency
          : 'weekly',
        retention_days: Number.isFinite(Number(body.backup_policy?.retention_days))
          ? Math.max(7, Math.min(365, Math.round(Number(body.backup_policy.retention_days))))
          : 30,
      },
      compliance_policy: {
        require_document_approval: boolValue(body.compliance_policy?.require_document_approval, true),
        allow_staff_self_service: boolValue(body.compliance_policy?.allow_staff_self_service, true),
        allow_staff_id_download: boolValue(body.compliance_policy?.allow_staff_id_download, false),
      },
      storage_quota_mb:
        Number.isFinite(storageQuotaMb) && storageQuotaMb > 0
          ? Math.round(storageQuotaMb)
          : 1024,
    }

    const { data, error } = await result.access.adminSupabase
      .from('organizations')
      .update(update)
      .eq('id', result.access.profile.organization_id!)
      .select('id, require_2fa, device_tracking_enabled, rate_limit_enabled, session_history_enabled, session_timeout_minutes, ip_allowlist, backup_policy, compliance_policy, storage_quota_mb')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await result.access.adminSupabase.from('audit_logs').insert({
      organization_id: result.access.profile.organization_id!,
      actor_profile_id: result.access.profile.id,
      action_type: 'security_settings_updated',
      entity_type: 'organization',
      entity_id: result.access.profile.organization_id!,
      metadata: {
        ...actorMetadata(result.access),
        module: 'Security Center',
        page: '/security-center',
        settings: update,
      },
    })

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('Security center save error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
