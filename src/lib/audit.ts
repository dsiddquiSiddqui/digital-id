import type { AdminAccess } from '@/lib/admin-auth'
import { actorMetadata } from '@/lib/admin-auth'

type AuditInput = {
  access: AdminAccess
  action: string
  entityType: string
  entityId?: string | null
  module: string
  page: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(input: AuditInput) {
  await input.access.adminSupabase.from('audit_logs').insert({
    organization_id: input.access.profile.organization_id,
    actor_profile_id: input.access.profile.id,
    action_type: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    metadata: {
      ...actorMetadata(input.access),
      module: input.module,
      page: input.page,
      ...(input.metadata || {}),
    },
  })
}
