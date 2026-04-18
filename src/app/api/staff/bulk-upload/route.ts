import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

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

function normalize(value: any): string | null {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function toBoolean(value: any, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return fallback
  return ['true', '1', 'yes', 'y'].includes(text)
}

function toNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function excelDateToISO(value: any): string | null {
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

function buildFullName(row: Record<string, any>) {
  const fullName = normalize(row.full_name)
  if (fullName) return fullName

  const first = normalize(row.first_name) || ''
  const last = normalize(row.last_name) || ''
  const joined = `${first} ${last}`.trim()
  return joined || null
}

async function findStaffByParimOrEmployeeCode(
  supabase: any,
  parimStaffId: string | null,
  employeeCode: string | null
) {
  if (parimStaffId) {
    const { data, error } = await supabase
      .from('staff')
      .select('id, employee_code, parim_staff_id, full_name')
      .eq('parim_staff_id', parimStaffId)
      .maybeSingle()

    if (error) throw error
    if (data) return data
  }

  if (employeeCode) {
    const { data, error } = await supabase
      .from('staff')
      .select('id, employee_code, parim_staff_id, full_name')
      .eq('employee_code', employeeCode)
      .maybeSingle()

    if (error) throw error
    if (data) return data
  }

  return null
}

async function generateEmployeeCode(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `HD-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`

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

function generateQrToken() {
  return crypto.randomBytes(24).toString('hex')
}

function cleanRows(rows: any[]) {
  return Array.isArray(rows) ? rows.filter((row) => Object.values(row).some((v) => String(v ?? '').trim() !== '')) : []
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  const stats = {
    staffCreated: 0,
    staffUpdated: 0,
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
        ? cleanRows(XLSX.utils.sheet_to_json<any>(workbook.Sheets[sheetName], { defval: '' }))
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

    const { data: documentTypes, error: documentTypesError } = await supabase
      .from('document_types')
      .select('id, code, name, has_expiry')

    if (documentTypesError) throw documentTypesError

    const docTypeByCode = new Map<string, any>()
    const docTypeByName = new Map<string, any>()

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

        if (!employeeCode) {
          employeeCode = await generateEmployeeCode(supabase)
        }

        const existing = await findStaffByParimOrEmployeeCode(supabase, parimStaffId, employeeCode)

        const payload = {
          parim_staff_id: parimStaffId,
          employee_code: employeeCode,
          full_name: fullName,
          first_name: normalize(row.first_name),
          last_name: normalize(row.last_name),
          parim_person_id: normalize(row.parim_person_id),
          company_name: normalize(row.company_name) || 'H&D Security',
          email: normalize(row.email),
          phone: normalize(row.phone),
          second_phone: normalize(row.second_phone),
          staff_type: normalize(row.staff_type) || 'security',
          status: normalize(row.status) || 'active',
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

        if (existing?.id) {
          const { error } = await supabase.from('staff').update(payload).eq('id', existing.id)
          if (error) throw error

          staffIdByParim.set(parimStaffId, existing.id)
          stats.staffUpdated++
        } else {
          const { data, error } = await supabase
            .from('staff')
            .insert(payload)
            .select('id')
            .single()

          if (error) throw error

          staffIdByParim.set(parimStaffId, data.id)
          stats.staffCreated++
        }
      } catch (error: any) {
        stats.failed++
        errors.push({
          sheet: 'Staff',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: error?.message || 'Failed to import staff row',
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

        const isCurrent = toBoolean(row.is_current, true)
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
          is_current: isCurrent,
          notes: normalize(row.notes),
        }

        let existing: any = null

        if (isCurrent) {
          const result = await supabase
            .from('staff_employment')
            .select('id')
            .eq('staff_id', staffId)
            .eq('is_current', true)
            .maybeSingle()

          if (result.error) throw result.error
          existing = result.data
        } else if (payload.contract_number) {
          const result = await supabase
            .from('staff_employment')
            .select('id')
            .eq('staff_id', staffId)
            .eq('contract_number', payload.contract_number)
            .maybeSingle()

          if (result.error) throw result.error
          existing = result.data
        }

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
      } catch (error: any) {
        stats.failed++
        errors.push({
          sheet: 'Employment',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: error?.message || 'Failed to import employment row',
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

        const isCurrent = toBoolean(row.is_current, true)
        const payload = {
          staff_id: staffId,
          street_address: normalize(row.street_address),
          house_no: normalize(row.house_no),
          apartment_no: normalize(row.apartment_no),
          city: normalize(row.city),
          county: normalize(row.county),
          post_code: normalize(row.post_code),
          country: normalize(row.country),
          is_current: isCurrent,
        }

        let existing: any = null

        if (isCurrent) {
          const result = await supabase
            .from('staff_addresses')
            .select('id')
            .eq('staff_id', staffId)
            .eq('is_current', true)
            .maybeSingle()

          if (result.error) throw result.error
          existing = result.data
        }

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
      } catch (error: any) {
        stats.failed++
        errors.push({
          sheet: 'CurrentAddress',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: error?.message || 'Failed to import address row',
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
      } catch (error: any) {
        stats.failed++
        errors.push({
          sheet: 'EmergencyContacts',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: error?.message || 'Failed to import emergency contact row',
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

        const isCurrent = toBoolean(row.is_current, true)
        const payload = {
          staff_id: staffId,
          account_holder_name: normalize(row.account_holder_name),
          bank_account_number: normalize(row.bank_account_number),
          sort_code: normalize(row.sort_code),
          reference_number: normalize(row.reference_number),
          bank_name: normalize(row.bank_name),
          country: normalize(row.country),
          is_current: isCurrent,
        }

        let existing: any = null

        if (isCurrent) {
          const result = await supabase
            .from('staff_bank_details')
            .select('id')
            .eq('staff_id', staffId)
            .eq('is_current', true)
            .maybeSingle()

          if (result.error) throw result.error
          existing = result.data
        }

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
      } catch (error: any) {
        stats.failed++
        errors.push({
          sheet: 'BankDetails',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: error?.message || 'Failed to import bank details row',
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
        const isCurrent = toBoolean(row.is_current, true)

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
          watermark_text: normalize(row.watermark_text),
          is_current: isCurrent,
          status: normalize(row.status) || 'active',
        }

        let existing: any = null

        if (isCurrent) {
          const result = await supabase
            .from('staff_ids')
            .select('id')
            .eq('staff_id', staffId)
            .eq('is_current', true)
            .maybeSingle()

          if (result.error) throw result.error
          existing = result.data
        } else {
          const result = await supabase
            .from('staff_ids')
            .select('id')
            .eq('staff_id', staffId)
            .eq('id_number', idNumber)
            .maybeSingle()

          if (result.error) throw result.error
          existing = result.data
        }

        if (existing?.id) {
          const { error } = await supabase.from('staff_ids').update(payload).eq('id', existing.id)
          if (error) throw error
          stats.digitalIdUpdated++
        } else {
          const { error } = await supabase.from('staff_ids').insert(payload)
          if (error) throw error
          stats.digitalIdInserted++
        }
      } catch (error: any) {
        stats.failed++
        errors.push({
          sheet: 'DigitalIDs',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: error?.message || 'Failed to import digital ID row',
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

        let matchedType: any = null
        if (code && docTypeByCode.has(code)) matchedType = docTypeByCode.get(code)
        if (!matchedType && name && docTypeByName.has(name)) matchedType = docTypeByName.get(name)

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

        const { data: existing, error: lookupError } = await supabase
          .from('staff_documents')
          .select('id')
          .eq('staff_id', staffId)
          .eq('document_type_id', matchedType?.id || null)
          .eq('custom_document_name', customDocumentName)
          .eq('document_number', payload.document_number)
          .maybeSingle()

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
      } catch (error: any) {
        stats.failed++
        errors.push({
          sheet: 'Documents',
          row: rowNumber,
          parim_staff_id: parimStaffId || undefined,
          message: error?.message || 'Failed to import document row',
        })
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      errors,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Bulk upload failed',
      },
      { status: 500 }
    )
  }
}
