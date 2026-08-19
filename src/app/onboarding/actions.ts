'use server'

import { redirect } from 'next/navigation'
import { createOrganizationWithOwner } from '@/lib/saas-data'
import { ORGANIZATION_THEMES } from '@/lib/saas-themes'
import { isBillingPlanKey } from '@/lib/billing-plans'

export type OnboardingState = {
  error?: string
}

function value(formData: FormData, key: string) {
  const field = formData.get(key)
  return typeof field === 'string' ? field.trim() : ''
}

export async function registerOrganization(
  _state: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const organizationName = value(formData, 'organizationName')
  const ownerName = value(formData, 'ownerName')
  const ownerEmail = value(formData, 'ownerEmail').toLowerCase()
  const ownerPassword = value(formData, 'ownerPassword')
  const phone = value(formData, 'phone')
  const themeKey = value(formData, 'themeKey')
  const planKey = value(formData, 'planKey') || 'free'

  if (!organizationName || !ownerName || !ownerEmail || !ownerPassword) {
    return { error: 'Organization, owner name, email, and password are required.' }
  }

  if (ownerPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  if (!ORGANIZATION_THEMES.some((theme) => theme.key === themeKey)) {
    return { error: 'Please select a valid theme.' }
  }

  if (!isBillingPlanKey(planKey)) {
    return { error: 'Please select a valid package.' }
  }

  let slug = ''

  try {
    const result = await createOrganizationWithOwner({
      organizationName,
      ownerName,
      ownerEmail,
      ownerPassword,
      phone: phone || null,
      themeKey,
      planKey,
    })

    slug = result.slug
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to create the organization.',
    }
  }

  redirect(`/login?workspace=${encodeURIComponent(slug)}&created=1`)
}
