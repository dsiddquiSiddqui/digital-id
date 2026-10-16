import { describe, expect, it } from 'vitest'
import { getEffectiveOrganizationLimits } from '@/lib/organization-limits'

const plan = { userLimit: 8, staffLimit: 150 }

describe('getEffectiveOrganizationLimits', () => {
  it('uses the billing plan when no custom limits are configured', () => {
    expect(
      getEffectiveOrganizationLimits(
        { custom_user_limit: null, custom_staff_limit: null },
        plan
      )
    ).toEqual({ users: 8, staff: 150 })
  })

  it('uses each organization override independently', () => {
    expect(
      getEffectiveOrganizationLimits(
        { custom_user_limit: 12, custom_staff_limit: null },
        plan
      )
    ).toEqual({ users: 12, staff: 150 })
  })

  it('supports custom limits for an otherwise unlimited plan', () => {
    expect(
      getEffectiveOrganizationLimits(
        { custom_user_limit: 40, custom_staff_limit: 5000 },
        { userLimit: null, staffLimit: null }
      )
    ).toEqual({ users: 40, staff: 5000 })
  })
})
