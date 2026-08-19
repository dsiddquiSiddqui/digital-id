export type BillingPlanKey = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise'

export type BillingPlan = {
  key: BillingPlanKey
  name: string
  monthlyPrice: number | null
  userLimit: number | null
  staffLimit: number | null
  description: string
  features: string[]
  highlight?: string
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    key: 'free',
    name: 'Free',
    monthlyPrice: 0,
    userLimit: 3,
    staffLimit: 25,
    description: 'For trying the platform with one small workspace.',
    highlight: 'Trial workspace',
    features: ['3 admin user seats', '25 staff records', 'Digital ID verification'],
  },
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    userLimit: 8,
    staffLimit: 150,
    description: 'For small operators that need daily staff ID control.',
    highlight: 'Small security teams',
    features: ['8 admin user seats', '150 staff records', 'Documents and alerts'],
  },
  {
    key: 'growth',
    name: 'Growth',
    monthlyPrice: 149,
    userLimit: 25,
    staffLimit: 750,
    description: 'For multi-site teams with several managers and HR users.',
    highlight: 'Most balanced',
    features: ['25 admin user seats', '750 staff records', 'Bulk upload workflows'],
  },
  {
    key: 'scale',
    name: 'Scale',
    monthlyPrice: 399,
    userLimit: 75,
    staffLimit: 3000,
    description: 'For high-volume operations with layered access control.',
    highlight: 'Large operations',
    features: ['75 admin user seats', '3,000 staff records', 'Advanced tenant controls'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    userLimit: null,
    staffLimit: null,
    description: 'Custom limits, controls, and rollout support.',
    highlight: 'Custom rollout',
    features: ['Custom admin seats', 'Custom staff volume', 'Contract and SLA options'],
  },
]

export function getBillingPlan(planKey: string | null | undefined) {
  return BILLING_PLANS.find((plan) => plan.key === planKey) ?? BILLING_PLANS[0]
}

export function formatPlanLimit(limit: number | null, label: string) {
  return limit === null ? `Custom ${label}` : `${limit.toLocaleString()} ${label}`
}

export function isBillingPlanKey(planKey: string): planKey is BillingPlanKey {
  return BILLING_PLANS.some((plan) => plan.key === planKey)
}
