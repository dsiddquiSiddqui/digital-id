import { getBillingPlan } from '@/lib/billing-plans'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseLike = Pick<SupabaseClient, 'from'>

function percent(used: number, limit: number | null) {
  if (limit === null) return 0
  if (limit <= 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

export async function getOrganizationPlanUsage(
  supabase: SupabaseLike,
  organizationId: string
) {
  const { data: organization } = await supabase
    .from('organizations')
    .select(
      'id, name, slug, status, plan, storage_quota_mb, require_2fa, device_tracking_enabled, rate_limit_enabled, session_history_enabled, session_timeout_minutes, ip_allowlist, backup_policy, compliance_policy'
    )
    .eq('id', organizationId)
    .single()

  const [
    usersResult,
    staffResult,
    idsResult,
    activeIdsResult,
    documentsResult,
    devicesResult,
    alertsResult,
    storageResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('role', 'staff'),
    supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('staff_ids')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('staff_ids')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .eq('status', 'active'),
    supabase
      .from('staff_documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('file_assets')
      .select('size_bytes')
      .eq('organization_id', organizationId),
  ])

  const plan = getBillingPlan(organization?.plan)
  const users = usersResult.count || 0
  const staff = staffResult.count || 0
  const storageBytes = (storageResult.data || []).reduce(
    (sum: number, asset: { size_bytes?: number | string | null }) =>
      sum + Number(asset.size_bytes || 0),
    0
  )
  const storageMb = Math.round((storageBytes / 1024 / 1024) * 100) / 100

  return {
    organization: organization || null,
    plan,
    usage: {
      users,
      staff,
      ids: idsResult.count || 0,
      activeIds: activeIdsResult.count || 0,
      documents: documentsResult.count || 0,
      devices: devicesResult.count || 0,
      securityAlerts: alertsResult.count || 0,
      storageMb,
      storageBytes,
    },
    limits: {
      users: plan.userLimit,
      staff: plan.staffLimit,
      storageMb: organization?.storage_quota_mb ?? 1024,
    },
    percentages: {
      users: percent(users, plan.userLimit),
      staff: percent(staff, plan.staffLimit),
      storage: percent(storageMb, organization?.storage_quota_mb ?? 1024),
    },
    isOverLimit: {
      users: plan.userLimit !== null && users > plan.userLimit,
      staff: plan.staffLimit !== null && staff > plan.staffLimit,
    },
  }
}
