'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createOrganizationWithOwner, slugifyOrganizationName } from '@/lib/saas-data'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export type OnboardingState = {
  error?: string
}

export type StepValidationResult = {
  ok: boolean
  error?: string
}

function value(formData: FormData, key: string) {
  const field = formData.get(key)
  return typeof field === 'string' ? field.trim() : ''
}

async function signupCheckLimit(scope: 'account' | 'workspace') {
  const requestHeaders = await headers()
  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip')?.trim() ||
    'local'

  return checkRateLimit({
    key: `signup-check:${scope}:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
    route: `/signup/check/${scope}`,
  })
}

async function accountIsAvailable(email: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (error) throw new Error('Unable to check this account right now.')
  return !data
}

async function workspaceIsAvailable(organizationName: string) {
  const supabase = createAdminClient()
  const slug = slugifyOrganizationName(organizationName)
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error('Unable to check this workspace right now.')
  return !data
}

export async function validateAccountStep(input: {
  ownerName: string
  ownerEmail: string
}): Promise<StepValidationResult> {
  const ownerName = input.ownerName.trim()
  const ownerEmail = input.ownerEmail.trim().toLowerCase()

  if (!ownerName || !/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    return { ok: false, error: 'Enter your name and a valid work email.' }
  }

  const limited = await signupCheckLimit('account')
  if (!limited.allowed) {
    return { ok: false, error: 'Too many account checks. Please try again later.' }
  }

  try {
    if (!(await accountIsAvailable(ownerEmail))) {
      return { ok: false, error: 'An account already exists for this email. Sign in instead.' }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to check this account.' }
  }
}

export async function validateWorkspaceStep(input: {
  organizationName: string
}): Promise<StepValidationResult> {
  const organizationName = input.organizationName.trim()

  if (organizationName.length < 2) {
    return { ok: false, error: 'Workspace name must be at least 2 characters.' }
  }

  const limited = await signupCheckLimit('workspace')
  if (!limited.allowed) {
    return { ok: false, error: 'Too many workspace checks. Please try again later.' }
  }

  try {
    if (!(await workspaceIsAvailable(organizationName))) {
      return { ok: false, error: 'That workspace URL is already taken. Try a more specific name.' }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to check this workspace.' }
  }
}

export async function registerOrganization(
  _state: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const requestHeaders = await headers()
  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip')?.trim() ||
    'local'
  const limited = await checkRateLimit({
    key: `signup:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
    route: '/signup',
  })

  if (!limited.allowed) {
    return { error: 'Too many signup attempts. Please try again later.' }
  }

  const organizationName = value(formData, 'organizationName')
  const ownerName = value(formData, 'ownerName')
  const ownerEmail = value(formData, 'ownerEmail').toLowerCase()
  const ownerPassword = value(formData, 'ownerPassword')
  const phone = value(formData, 'phone')

  if (!organizationName || !ownerName || !ownerEmail || !ownerPassword) {
    return { error: 'Organization, owner name, email, and password are required.' }
  }

  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    return { error: 'Enter a valid work email address.' }
  }

  if (organizationName.length < 2) {
    return { error: 'Workspace name must be at least 2 characters.' }
  }

  if (ownerPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  try {
    if (!(await accountIsAvailable(ownerEmail))) {
      return { error: 'An account already exists for this email. Sign in instead.' }
    }
    if (!(await workspaceIsAvailable(organizationName))) {
      return { error: 'That workspace URL is already taken. Go back and choose another name.' }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to validate signup details.' }
  }

  let slug = ''

  try {
    const result = await createOrganizationWithOwner({
      organizationName,
      ownerName,
      ownerEmail,
      ownerPassword,
      phone: phone || null,
      themeKey: 'command-blue',
      planKey: 'free',
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

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  })

  if (signInError) {
    redirect(`/login?workspace=${encodeURIComponent(slug)}&created=1`)
  }

  redirect('/setup-wizard?welcome=1')
}
