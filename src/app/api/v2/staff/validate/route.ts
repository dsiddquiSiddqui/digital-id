import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['super_admin', 'admin', 'manager']
const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'archived']
const ALLOWED_TYPES = ['security', 'warehouse', 'event', 'admin', 'contractor', 'other']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.organization_id || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = await request.json()
    const step = textValue(body.step)

    if (step === 'identity') {
      const fullName = textValue(body.full_name)
      const employeeCode = textValue(body.employee_code)
      if (!fullName || !employeeCode) {
        return NextResponse.json({ error: 'Full name and employee code are required.' }, { status: 400 })
      }

      const { data: existingStaff } = await adminSupabase
        .from('staff')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('employee_code', employeeCode)
        .maybeSingle()

      if (existingStaff) {
        return NextResponse.json({ error: 'That employee code is already used in this workspace.' }, { status: 409 })
      }
    }

    if (step === 'access') {
      const email = textValue(body.email).toLowerCase()
      const createLogin = body.create_login === true
      if (email && !EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
      }
      if (createLogin && !email) {
        return NextResponse.json({ error: 'Email is required when creating portal access.' }, { status: 400 })
      }

      if (email) {
        const [profileResult, staffResult] = await Promise.all([
          adminSupabase.from('profiles').select('id').eq('email', email).maybeSingle(),
          adminSupabase.from('staff').select('id').eq('organization_id', profile.organization_id).eq('email', email).maybeSingle(),
        ])
        if (profileResult.data || staffResult.data) {
          return NextResponse.json({ error: 'That email is already connected to another person.' }, { status: 409 })
        }
      }
    }

    if (step === 'assignment') {
      const staffType = textValue(body.staff_type)
      const status = textValue(body.status)
      if (!ALLOWED_TYPES.includes(staffType) || !ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Choose a valid staff type and status.' }, { status: 400 })
      }
    }

    if (!['identity', 'access', 'assignment', 'personal'].includes(step)) {
      return NextResponse.json({ error: 'Unknown validation step.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, checked_at: new Date().toISOString() })
  } catch (error) {
    console.error('Staff step validation error:', error)
    return NextResponse.json({ error: 'Unable to validate this step.' }, { status: 500 })
  }
}
