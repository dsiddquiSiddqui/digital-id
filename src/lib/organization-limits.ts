import type { BillingPlan } from '@/lib/billing-plans'

type OrganizationLimitOverrides = {
  custom_user_limit?: number | null
  custom_staff_limit?: number | null
}

export function getEffectiveOrganizationLimits(
  organization: OrganizationLimitOverrides | null | undefined,
  plan: Pick<BillingPlan, 'userLimit' | 'staffLimit'>
) {
  return {
    users:
      organization?.custom_user_limit == null
        ? plan.userLimit
        : organization.custom_user_limit,
    staff:
      organization?.custom_staff_limit == null
        ? plan.staffLimit
        : organization.custom_staff_limit,
  }
}
