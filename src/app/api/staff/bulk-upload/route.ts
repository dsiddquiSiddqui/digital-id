import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getBillingPlan } from '@/lib/billing-plans'

export const runtime = 'nodejs'

const ALLOWED_STATUSES = ['active', 'inactive', 'suspended', 'revoked', 'archived']
const ALLOWED_TYPES = ['security', 'warehouse', 'event', 'admin', 'contractor', 'other']
type ImportRow = Record<string, unknown>
type DocumentTypeRow = { id: string; code: string; name: string; has_expiry: boolean | null }

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function normalize(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return fallback

  return ['true', '1', 'yes', 'y'].includes(text)
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function excelDateToISO(value: unknown): string | null {
  if (!value) return null

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
    return date.toISOString().slice(0, 10)
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const text = String(value).trim()
  if (!text) return null

  const date = new Date(text)
  if (isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function buildFullName(row: ImportRow) {
  const fullName = normalize(row.full_name)
  if (fullName) return fullName

  const first = normalize(row.first_name) || ''
  const last = normalize(row.last_name) || ''
  const joined = `${first} ${last}`.trim()
  return joined || null
}

function cleanRows(rows: ImportRow[]) {
  return Array.isArray(rows)
    ? rows.filter((row) =>
        Object.values(row).some((v) => String(v ?? '').trim() !== '')
      )
    : []
}

function generateQrToken() {
  return crypto.randomBytes(24).toString('hex')
}

function generateTempPassword(length = 12) {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

async function generateEmployeeCode(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `HD-${Date.now().toString().slice(-6)}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`

    const { data, error } = await supabase
      .from('staff')
      .select('id')
      .eq('employee_code', code)
      .maybeSingle()

    if (error) throw error
    if (!data) return code
  }

  throw new Error('Unable to generate a unique employee_code')
}

async function findStaffByParimOrEmployeeCode(
  supabase: SupabaseClient,
  parimStaffId: string | null,
  employeeCode: string | null
) {
  if (parimStaffId) {
    const { data, error } = await supabase
      .from('staff')
      .select('id, profile_id, employee_code, parim_staff_id, full_name, email')
      .eq('parim_staff_id', parimStaffId)
      .maybeSingle()

    if (error) throw error
    if (data) return data
  }

  if (employeeCode) {
    const { data, error } = await supabase
      .from('staff')
      .select('id, profile_id, employee_code, parim_staff_id, full_name, email')
      .eq('employee_code', employeeCode)
      .maybeSingle()

    if (error) throw error
    if (data) return data
  }

  return null
}

async function getExistingProfileByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email, role')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function createProfileAndLoginForBulk(params: {
  supabase: SupabaseClient
  fullName: string
  email: string
  password: string
  status: string
}) {
  const { supabase, fullName, email, password, status } = params

  const existingProfile = await getExistingProfileByEmail(supabase, email)
  if (existingProfile?.id) {
    return {
      created: false,
      linked: true,
      profileId: existingProfile.id,
      authUserId: existingProfile.auth_user_id ?? null,
      tempPassword: null,
      message: 'Existing profile linked',
    }
  }

  const { data: authResult, error: authError } =
    await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'staff',
      },
    })

  if (authError || !authResult.user) {
    throw new Error(authError?.message || 'Failed to create auth user.')
  }

  const createdAuthUserId = authResult.user.id

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from('profiles')
    .insert([
      {
        auth_user_id: createdAuthUserId,
        role: 'staff',
        full_name: fullName,
        email: email.toLowerCase(),
        is_active: status === 'active',
      },
    ])
    .select('id')
    .single()

  if (createdProfileError || !createdProfile) {
    await supabase.auth.admin.deleteUser(createdAuthUserId)
    throw new Error(createdProfileError?.message || 'Failed to create staff profile.')
  }

  return {
    created: true,
    linked: false,
    profileId: createdProfile.id,
    authUserId: createdAuthUserId,
    tempPassword: password,
    message: 'New auth user and profile created',
  }
}

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const authSupabase = await createServerClient()

  const stats = {
    staffCreated: 0,
    staffUpdated: 0,
    loginCreated: 0,
    loginLinked: 0,
    employmentInserted: 0,
    employmentUpdated: 0,
    addressInserted: 0,
    addressUpdated: 0,
    emergencyInserted: 0,
    emergencyUpdated: 0,
    bankInserted: 0,
    bankUpdated: 0,
    digitalIdInserted: 0,
    digitalIdUpdated: 0,
    documentsInserted: 0,
    documentsUpdated: 0,
    skipped: 0,
    failed: 0,
  }

  const errors: Array<{
    sheet: string
    parim_staff_id?: string
    row?: number
    message: string
  }> = []

  const generatedPasswords: Array<{
    parim_staff_id: string
    full_name: string
    email: string
    temp_password: string
  }> = []
  let importBatchId: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Excel file is required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

    const getSheetRows = (sheetName: string) =>
      workbook.SheetNames.includes(sheetName)
        ? cleanRows(
            XLSX.utils.sheet_to_json<ImportRow>(workbook.Sheets[sheetName], { defval: '' })
          )
        : []

    const staffRows = getSheetRows('Staff')
    const employmentRows = getSheetRows('Employment')
    const addressRows = getSheetRows('CurrentAddress')
    const emergencyRows = getSheetRows('EmergencyContacts')
    const bankRows = getSheetRows('BankDetails')
    const digitalIdRows = getSheetRows('DigitalIDs')
    const documentRows = getSheetRows('Documents')

    if (staffRows.length === 0) {
      return NextResponse.json(
        { error: 'The Staff sheet is required and must contain at least one row' },
        { status: 400 }
      )
    }

    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: currentProfile } = await authSupabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (
      !currentProfile?.organization_id ||
      !['super_admin', 'admin', 'hr_manager', 'hr'].includes(currentProfile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { data: importBatch } = await supabase
      .from('staff_import_batches')
      .insert({
        organization_id: currentProfile.organization_id,
        source: 'admin_bulk_upload',
        file_name: file.name || 'bulk-upload.xlsx',
        uploaded_by: currentProfile.id,
        status: 'processing',
        total_rows:
          staffRows.length +
          employmentRows.length +
          addressRows.length +
          emergencyRows.length +
          bankRows.length +
          digitalIdRows.length +
          documentRows.length,
      })
      .select('id')
      .single()

    importBatchId = importBatch?.id || null

    const { data: organization } = await supabase
      .from('organizations')
      .select('id, plan')
      .eq('id', currentProfile.organization_id)
      .single()

    const { count: existingStaffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', currentProfile.organization_id)

    const plan = getBillingPlan(organization?.plan)
    const incomingCreateRows = staffRows.length

    if (
      plan.staffLimit !== null &&
      (existingStaffCount || 0) + incomingCreateRows > plan.staffLimit
    ) {
      return NextResponse.json(
        {
          error: `This package allows ${plan.staffLimit} staff records. Reduce the import or upgrade the package.`,
        },
        { status: 400 }
      )
    }

    const { data: documentTypes, error: documentTypesError } = await supabase
      .from('document_types')
      .select('id, code, name, has_expiry')
      .eq('organization_id', currentProfile.organization_id)

    if (documentTypesError) throw documentTypesError

    const docTypeByCode = new Map<string, DocumentTypeRow>()
    const docTypeByName = new Map<string, DocumentTypeRow>()

    for (const item of documentTypes || []) {
      docTypeByCode.set(String(item.code).toLowerCase(), item)
      docTypeByName.set(String(item.name).toLowerCase(), item)
    }

    const staffIdByParim = new Map<string, string>()

    for (let i = 0; i < staffRows.length; i++) {
      const row = staffRows[i]
      const rowNumber = i + 2
      const parimStaffId = normalize(row.parim_staff_id)
      let employeeCode = normalize(row.employee_code)
      const fullName = buildFullName(row)

      let createdAuthUserId: string | null = null
      let createdProfileId: string | null = null

      try {
        if (!parimStaffId) {
          stats.failed++
          errors.push({
            sheet: 'Staff',
            row: rowNumber,
            message: 'parim_staff_id is required',
          })
          continue
        }

        if (!fullName) {
          stats.failed++
          errors.push({
            sheet: 'Staff',
            row: rowNumber,
            parim_staff_id: parimStaffId,
            message: 'full_name is required, or first_name/last_name must be supplied',
          })
          continue
        }

        const email = normalize(row.email)?.toLowerCase() || null
        const createLogin = toBoolean(row.create_login, false)
        let password = normalize(row.password)

        if (!employeeCode) {
          employeeCode = await generateEmployeeCode(supabase)
        }

        const staffType = normalize(row.staff_type) || 'security'
        const status = normalize(row.status) || 'active'

        if (!ALLOWED_STATUSES.includes(status)) {
          throw new Error(`Invalid status value: ${status}`)
        }

        if (!ALLOWED_TYPES.includes(staffType)) {
          throw new Error(`Invalid staff_type value: ${staffType}`)
        }

        if (createLogin) {
          if (!email) {
            throw new Error('Email is required when creating a login account')
          }

          if (password && password.length < 8) {
            throw new Error('Password must be at least 8 characters long')
          }

          if (!password) {
            password = generateTempPassword()
          }
        }

        const existing = await findStaffByParimOrEmployeeCode(
          supabase,
          parimStaffId,
          employeeCode
        )

        let profileId = existing?.profile_id || null

        if (createLogin) {
          if (profileId) {
            stats.loginLinked++
          } else {
            const loginResult = await createProfileAndLoginForBulk({
              supabase,
              fullName,
              email: email!,
              password: password!,
              status,
            })

            profileId = loginResult.profileId
            createdProfileId = loginResult.profileId
            createdAuthUserId = loginResult.authUserId

            if (loginResult.created) stats.loginCreated++
            if (loginResult.linked) stats.loginLinked++

            if (loginResult.created && row.password === '' && email) {
              generatedPasswords.push({
                parim_staff_id: parimStaffId,
                full_name: fullName,
                email,
                temp_password: password!,
              })
            }
          }
        }

        const payload = {
          profile_id: profileId,
          parim_staff_id: parimStaffId,
          employee_code: employeeCode,
          full_name: fullName,
          first_name: normalize(row.first_name),
          last_name: normalize(row.last_name),
          parim_person_id: normalize(row.parim_person_id),
          company_name: normalize(row.company_name) || 'Security Services',
          email,
          phone: normalize(row.phone),
          second_phone: normalize(row.second_phone),
          staff_type: staffType,
          status,
          nationality: normalize(row.nationality),
          country_of_birth: normalize(row.country_of_birth),
          gender: normalize(row.gender),
          date_of_birth: excelDateToISO(row.date_of_birth),
          access_to_car: toBoolean(row.access_to_car, false),
          driver_licence: toBoolean(row.driver_licence, false),
          notes: normalize(row.notes),
          photo_url: normalize(row.photo_url),
          import_source: 'bulk_excel',
        }

        let staffId: string

        if (existing?.id) {
          const { error } = await supabase
            .from('staff')
            .update(payload)
            .eq('id', existing.id)

          if (error) throw error

          staffId = existing.id
          stats.staffUpdated++
        } else {
          const { data, error } = await supabase
            .from('staff')
            .insert(payload)
            .select('id')
            .single()

          if (error) throw error

          staffId = data.id
          stats.staffCreated++
        }

        staffIdByParim.set(parimStaffId, staffId)
      } catch (error: unknown) {
        if (createdProfileId) {
          await supabase.from('profiles').delete().eq('id', createdProfileId)
        }

        if (createdAuthUserId) {
          await supabase.auth.admin.deleteUser(createdAuthUserId)
        }

        stats.failed++
        errors.push({
          sheet: 'Staff',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: getErrorMessage(error, 'Failed to import staff row'),
        })
      }
    }

    async function getStaffId(parimStaffId: string | null) {
      if (!parimStaffId) return null
      if (staffIdByParim.has(parimStaffId)) return staffIdByParim.get(parimStaffId)!

      const { data, error } = await supabase
        .from('staff')
        .select('id')
        .eq('parim_staff_id', parimStaffId)
        .maybeSingle()

      if (error) throw error
      if (data?.id) {
        staffIdByParim.set(parimStaffId, data.id)
        return data.id
      }

      return null
    }

    for (let i = 0; i < employmentRows.length; i++) {
      const row = employmentRows[i]
      const rowNumber = i + 2
      const parimStaffId = normalize(row.parim_staff_id)

      try {
        const staffId = await getStaffId(parimStaffId)
        if (!staffId) {
          stats.failed++
          errors.push({
            sheet: 'Employment',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'Staff not found for parim_staff_id',
          })
          continue
        }

        const payload = {
          staff_id: staffId,
          employment_type: normalize(row.employment_type),
          contract_number: normalize(row.contract_number),
          contract_start: excelDateToISO(row.contract_start),
          contract_end: excelDateToISO(row.contract_end),
          pay_schedule: normalize(row.pay_schedule),
          payroll_reference: normalize(row.payroll_reference),
          tax_code: normalize(row.tax_code),
          ni_number: normalize(row.ni_number),
          personal_pay_rate: toNumber(row.personal_pay_rate),
          contracted_hours: toNumber(row.contracted_hours),
          holiday_entitlement: normalize(row.holiday_entitlement),
          is_current: true,
          notes: normalize(row.notes),
        }

        const { data: existing, error: lookupError } = await supabase
          .from('staff_employment')
          .select('id')
          .eq('staff_id', staffId)
          .eq('is_current', true)
          .maybeSingle()

        if (lookupError) throw lookupError

        if (existing?.id) {
          const { error } = await supabase
            .from('staff_employment')
            .update(payload)
            .eq('id', existing.id)

          if (error) throw error
          stats.employmentUpdated++
        } else {
          const { error } = await supabase.from('staff_employment').insert(payload)
          if (error) throw error
          stats.employmentInserted++
        }
      } catch (error: unknown) {
        stats.failed++
        errors.push({
          sheet: 'Employment',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: getErrorMessage(error, 'Failed to import employment row'),
        })
      }
    }

    for (let i = 0; i < addressRows.length; i++) {
      const row = addressRows[i]
      const rowNumber = i + 2
      const parimStaffId = normalize(row.parim_staff_id)

      try {
        const staffId = await getStaffId(parimStaffId)
        if (!staffId) {
          stats.failed++
          errors.push({
            sheet: 'CurrentAddress',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'Staff not found for parim_staff_id',
          })
          continue
        }

        const payload = {
          staff_id: staffId,
          street_address: normalize(row.street_address),
          house_no: normalize(row.house_no),
          apartment_no: normalize(row.apartment_no),
          city: normalize(row.city),
          county: normalize(row.county),
          post_code: normalize(row.post_code),
          country: normalize(row.country),
          is_current: true,
        }

        const { data: existing, error: lookupError } = await supabase
          .from('staff_addresses')
          .select('id')
          .eq('staff_id', staffId)
          .eq('is_current', true)
          .maybeSingle()

        if (lookupError) throw lookupError

        if (existing?.id) {
          const { error } = await supabase
            .from('staff_addresses')
            .update(payload)
            .eq('id', existing.id)

          if (error) throw error
          stats.addressUpdated++
        } else {
          const { error } = await supabase.from('staff_addresses').insert(payload)
          if (error) throw error
          stats.addressInserted++
        }
      } catch (error: unknown) {
        stats.failed++
        errors.push({
          sheet: 'CurrentAddress',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: getErrorMessage(error, 'Failed to import address row'),
        })
      }
    }

    for (let i = 0; i < emergencyRows.length; i++) {
      const row = emergencyRows[i]
      const rowNumber = i + 2
      const parimStaffId = normalize(row.parim_staff_id)

      try {
        const staffId = await getStaffId(parimStaffId)
        if (!staffId) {
          stats.failed++
          errors.push({
            sheet: 'EmergencyContacts',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'Staff not found for parim_staff_id',
          })
          continue
        }

        const name = normalize(row.name)
        if (!name) {
          stats.failed++
          errors.push({
            sheet: 'EmergencyContacts',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'name is required',
          })
          continue
        }

        const payload = {
          staff_id: staffId,
          name,
          relationship: normalize(row.relationship),
          phone: normalize(row.phone),
          email: normalize(row.email),
          is_primary: toBoolean(row.is_primary, false),
        }

        const { data: existing, error: lookupError } = await supabase
          .from('staff_emergency_contacts')
          .select('id')
          .eq('staff_id', staffId)
          .eq('name', name)
          .eq('phone', payload.phone)
          .maybeSingle()

        if (lookupError) throw lookupError

        if (existing?.id) {
          const { error } = await supabase
            .from('staff_emergency_contacts')
            .update(payload)
            .eq('id', existing.id)

          if (error) throw error
          stats.emergencyUpdated++
        } else {
          const { error } = await supabase.from('staff_emergency_contacts').insert(payload)
          if (error) throw error
          stats.emergencyInserted++
        }
      } catch (error: unknown) {
        stats.failed++
        errors.push({
          sheet: 'EmergencyContacts',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: getErrorMessage(error, 'Failed to import emergency contact row'),
        })
      }
    }

    for (let i = 0; i < bankRows.length; i++) {
      const row = bankRows[i]
      const rowNumber = i + 2
      const parimStaffId = normalize(row.parim_staff_id)

      try {
        const staffId = await getStaffId(parimStaffId)
        if (!staffId) {
          stats.failed++
          errors.push({
            sheet: 'BankDetails',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'Staff not found for parim_staff_id',
          })
          continue
        }

        const payload = {
          staff_id: staffId,
          account_holder_name: normalize(row.account_holder_name),
          bank_account_number: normalize(row.bank_account_number),
          sort_code: normalize(row.sort_code),
          reference_number: normalize(row.reference_number),
          bank_name: normalize(row.bank_name),
          country: normalize(row.country),
          is_current: true,
        }

        const { data: existing, error: lookupError } = await supabase
          .from('staff_bank_details')
          .select('id')
          .eq('staff_id', staffId)
          .eq('is_current', true)
          .maybeSingle()

        if (lookupError) throw lookupError

        if (existing?.id) {
          const { error } = await supabase
            .from('staff_bank_details')
            .update(payload)
            .eq('id', existing.id)

          if (error) throw error
          stats.bankUpdated++
        } else {
          const { error } = await supabase.from('staff_bank_details').insert(payload)
          if (error) throw error
          stats.bankInserted++
        }
      } catch (error: unknown) {
        stats.failed++
        errors.push({
          sheet: 'BankDetails',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: getErrorMessage(error, 'Failed to import bank details row'),
        })
      }
    }

    for (let i = 0; i < digitalIdRows.length; i++) {
      const row = digitalIdRows[i]
      const rowNumber = i + 2
      const parimStaffId = normalize(row.parim_staff_id)

      try {
        const staffId = await getStaffId(parimStaffId)
        if (!staffId) {
          stats.failed++
          errors.push({
            sheet: 'DigitalIDs',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'Staff not found for parim_staff_id',
          })
          continue
        }

        const idNumber = normalize(row.id_number)
        const issueDate = excelDateToISO(row.issue_date)
        const expiryDate = excelDateToISO(row.expiry_date)
        const roleTitle = normalize(row.role_title)
        const qrToken = normalize(row.qr_token) || generateQrToken()

        if (!idNumber || !issueDate || !expiryDate || !roleTitle) {
          stats.failed++
          errors.push({
            sheet: 'DigitalIDs',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'id_number, issue_date, expiry_date, and role_title are required',
          })
          continue
        }

        const payload = {
          staff_id: staffId,
          id_number: idNumber,
          issue_date: issueDate,
          expiry_date: expiryDate,
          site_name: normalize(row.site_name),
          role_title: roleTitle,
          sia_number: normalize(row.sia_number),
          qr_token: qrToken,
          watermark_text: normalize(row.watermark_text) || 'Security Services',
          is_current: true,
          status: normalize(row.status) || 'active',
        }

        const { data: existing, error: lookupError } = await supabase
          .from('staff_ids')
          .select('id')
          .eq('staff_id', staffId)
          .eq('is_current', true)
          .maybeSingle()

        if (lookupError) throw lookupError

        if (existing?.id) {
          const { error } = await supabase
            .from('staff_ids')
            .update(payload)
            .eq('id', existing.id)

          if (error) throw error
          stats.digitalIdUpdated++
        } else {
          const { error } = await supabase.from('staff_ids').insert(payload)
          if (error) throw error
          stats.digitalIdInserted++
        }
      } catch (error: unknown) {
        stats.failed++
        errors.push({
          sheet: 'DigitalIDs',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: getErrorMessage(error, 'Failed to import digital ID row'),
        })
      }
    }

    for (let i = 0; i < documentRows.length; i++) {
      const row = documentRows[i]
      const rowNumber = i + 2
      const parimStaffId = normalize(row.parim_staff_id)

      try {
        const staffId = await getStaffId(parimStaffId)
        if (!staffId) {
          stats.failed++
          errors.push({
            sheet: 'Documents',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message: 'Staff not found for parim_staff_id',
          })
          continue
        }

        const code = normalize(row.document_type_code)?.toLowerCase() || null
        const name = normalize(row.document_type_name)?.toLowerCase() || null
        const customDocumentName = normalize(row.custom_document_name)
        const customDocumentCode = normalize(row.custom_document_code)

        let matchedType: DocumentTypeRow | null = null
        if (code) matchedType = docTypeByCode.get(code) ?? null
        if (!matchedType && name) matchedType = docTypeByName.get(name) ?? null

        if (!matchedType && !customDocumentName) {
          stats.failed++
          errors.push({
            sheet: 'Documents',
            row: rowNumber,
            parim_staff_id: parimStaffId || undefined,
            message:
              'Provide a valid document_type_code/document_type_name, or use custom_document_name for custom documents',
          })
          continue
        }

        const hasExpiry =
          row.has_expiry === '' || row.has_expiry === null || row.has_expiry === undefined
            ? Boolean(matchedType?.has_expiry || false)
            : toBoolean(row.has_expiry, Boolean(matchedType?.has_expiry || false))

        const payload = {
          staff_id: staffId,
          document_type_id: matchedType?.id || null,
          document_number: normalize(row.document_number),
          issue_date: excelDateToISO(row.issue_date),
          expiry_date: excelDateToISO(row.expiry_date),
          status: normalize(row.status) || 'pending',
          verified: toBoolean(row.verified, false),
          file_url: normalize(row.file_url),
          notes: normalize(row.notes),
          custom_document_name: customDocumentName,
          custom_document_code: customDocumentCode,
          has_expiry: hasExpiry,
        }

        let query = supabase
          .from('staff_documents')
          .select('id')
          .eq('staff_id', staffId)

        if (matchedType?.id) {
          query = query.eq('document_type_id', matchedType.id)
        } else {
          query = query
            .is('document_type_id', null)
            .eq('custom_document_name', customDocumentName)
        }

        if (payload.document_number) {
          query = query.eq('document_number', payload.document_number)
        }

        const { data: existing, error: lookupError } = await query.maybeSingle()

        if (lookupError) throw lookupError

        if (existing?.id) {
          const { error } = await supabase
            .from('staff_documents')
            .update(payload)
            .eq('id', existing.id)

          if (error) throw error
          stats.documentsUpdated++
        } else {
          const { error } = await supabase.from('staff_documents').insert(payload)
          if (error) throw error
          stats.documentsInserted++
        }
      } catch (error: unknown) {
        stats.failed++
        errors.push({
          sheet: 'Documents',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: getErrorMessage(error, 'Failed to import document row'),
        })
      }
    }

    if (importBatchId) {
      if (errors.length > 0) {
        await supabase.from('staff_import_rows').insert(
          errors.map((error) => ({
            organization_id: currentProfile.organization_id,
            batch_id: importBatchId,
            row_number: error.row || 0,
            raw_data: {
              sheet: error.sheet,
              parim_staff_id: error.parim_staff_id || null,
            },
            processed: false,
            processing_errors: { message: error.message },
          }))
        )
      }

      await supabase
        .from('staff_import_batches')
        .update({
          status: errors.length > 0 ? 'completed' : 'completed',
          processed_rows:
            stats.staffCreated +
            stats.staffUpdated +
            stats.employmentInserted +
            stats.employmentUpdated +
            stats.addressInserted +
            stats.addressUpdated +
            stats.emergencyInserted +
            stats.emergencyUpdated +
            stats.bankInserted +
            stats.bankUpdated +
            stats.digitalIdInserted +
            stats.digitalIdUpdated +
            stats.documentsInserted +
            stats.documentsUpdated,
          failed_rows: errors.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importBatchId)
    }

    return NextResponse.json({
      success: true,
      import_batch_id: importBatchId,
      stats,
      generatedPasswords,
      errors,
    })
  } catch (error: unknown) {
    if (importBatchId) {
      await supabase
        .from('staff_import_batches')
        .update({
          status: 'failed',
          failed_rows: errors.length || 1,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importBatchId)
    }

    return NextResponse.json(
      {
        error: getErrorMessage(error, 'Bulk upload failed'),
      },
      { status: 500 }
    )
  }
}
