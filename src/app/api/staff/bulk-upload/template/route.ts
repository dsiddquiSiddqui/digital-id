import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

export async function GET() {
  const workbook = XLSX.utils.book_new()

  const instructions = XLSX.utils.aoa_to_sheet([
    ['Bulk Upload Template Instructions'],
    ['Use parim_staff_id as the master key on every sheet.'],
    ['Only the Staff sheet is required. All other sheets are optional.'],
    ['Do not add is_current columns. The importer handles current records automatically.'],
    ['To create login accounts in bulk, set create_login to true and provide email.'],
    ['If password is blank and create_login is true, the system will auto-generate a temporary password.'],
    ['If the staff already exists and already has a linked login/profile, the importer will not create a duplicate login.'],
    ['For standard documents, use document_type_code values such as passport, contract, sia_badge, right_to_work, visa, driving_licence, act_certificate, induction_certificate.'],
    ['For custom documents, leave document_type_code and document_type_name blank and fill custom_document_name.'],
    ['DigitalIDs requires id_number, issue_date, expiry_date, and role_title. qr_token is optional because the API auto-generates it.'],
    ['watermark_text is optional. If blank, the system uses SGC Security Services.'],
    ['Dates should be in YYYY-MM-DD format.'],
    ['For document files, use file_url if you already uploaded the file somewhere.'],
  ])

  const staff = XLSX.utils.json_to_sheet([
    {
      parim_staff_id: 'PARIM-1001',
      employee_code: '',
      full_name: 'Ali Raza',
      first_name: 'Ali',
      last_name: 'Raza',
      parim_person_id: 'PERSON-1001',
      company_name: 'SGC Security Services',
      email: 'ali.raza@example.com',
      password: '',
      create_login: 'true',
      phone: '+447700900001',
      second_phone: '',
      staff_type: 'security',
      status: 'active',
      nationality: 'British',
      country_of_birth: 'United Kingdom',
      gender: 'Male',
      date_of_birth: '1990-01-15',
      access_to_car: 'true',
      driver_licence: 'true',
      notes: 'Password left blank so system can generate one',
      photo_url: '',
    },
    {
      parim_staff_id: 'PARIM-1002',
      employee_code: '',
      full_name: 'Sarah Khan',
      first_name: 'Sarah',
      last_name: 'Khan',
      parim_person_id: 'PERSON-1002',
      company_name: 'SGC Security Services',
      email: 'sarah.khan@example.com',
      password: 'Welcome@123',
      create_login: 'true',
      phone: '+447700900002',
      second_phone: '',
      staff_type: 'security',
      status: 'active',
      nationality: 'British',
      country_of_birth: 'United Kingdom',
      gender: 'Female',
      date_of_birth: '1993-07-20',
      access_to_car: 'false',
      driver_licence: 'true',
      notes: 'Example with manual password',
      photo_url: '',
    },
    {
      parim_staff_id: 'PARIM-1003',
      employee_code: '',
      full_name: 'John Mensah',
      first_name: 'John',
      last_name: 'Mensah',
      parim_person_id: 'PERSON-1003',
      company_name: 'SGC Security Services',
      email: '',
      password: '',
      create_login: 'false',
      phone: '+447700900003',
      second_phone: '',
      staff_type: 'security',
      status: 'active',
      nationality: 'Ghanaian',
      country_of_birth: 'Ghana',
      gender: 'Male',
      date_of_birth: '1988-11-09',
      access_to_car: 'true',
      driver_licence: 'true',
      notes: 'Example without login account',
      photo_url: '',
    },
  ])

  const employment = XLSX.utils.json_to_sheet([
    {
      parim_staff_id: 'PARIM-1001',
      employment_type: 'full_time',
      contract_number: 'CNT-1001',
      contract_start: '2026-04-01',
      contract_end: '2027-03-31',
      pay_schedule: 'monthly',
      payroll_reference: 'PAY-1001',
      tax_code: '1257L',
      ni_number: 'AB123456C',
      personal_pay_rate: 13.5,
      contracted_hours: 40,
      holiday_entitlement: '28 days',
      notes: 'Current contract',
    },
    {
      parim_staff_id: 'PARIM-1002',
      employment_type: 'part_time',
      contract_number: 'CNT-1002',
      contract_start: '2026-04-10',
      contract_end: '2026-12-31',
      pay_schedule: 'weekly',
      payroll_reference: 'PAY-1002',
      tax_code: '1257L',
      ni_number: 'CD123456E',
      personal_pay_rate: 12.25,
      contracted_hours: 24,
      holiday_entitlement: 'pro rata',
      notes: '',
    },
    {
      parim_staff_id: 'PARIM-1003',
      employment_type: 'full_time',
      contract_number: 'CNT-1003',
      contract_start: '2026-03-01',
      contract_end: '2027-02-28',
      pay_schedule: 'monthly',
      payroll_reference: 'PAY-1003',
      tax_code: '1257L',
      ni_number: 'EF123456G',
      personal_pay_rate: 14,
      contracted_hours: 42,
      holiday_entitlement: '28 days',
      notes: '',
    },
  ])

  const address = XLSX.utils.json_to_sheet([
    {
      parim_staff_id: 'PARIM-1001',
      street_address: '12 Station Road',
      house_no: '12',
      apartment_no: '',
      city: 'London',
      county: 'Greater London',
      post_code: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    {
      parim_staff_id: 'PARIM-1002',
      street_address: '45 Oak Avenue',
      house_no: '45',
      apartment_no: '2B',
      city: 'Birmingham',
      county: 'West Midlands',
      post_code: 'B1 1AA',
      country: 'United Kingdom',
    },
    {
      parim_staff_id: 'PARIM-1003',
      street_address: '9 Hill Street',
      house_no: '9',
      apartment_no: '',
      city: 'Manchester',
      county: 'Greater Manchester',
      post_code: 'M1 1AE',
      country: 'United Kingdom',
    },
  ])

  const emergency = XLSX.utils.json_to_sheet([
    {
      parim_staff_id: 'PARIM-1001',
      name: 'Ahmed Raza',
      relationship: 'Brother',
      phone: '+447700911111',
      email: 'ahmed.raza@example.com',
      is_primary: 'true',
    },
    {
      parim_staff_id: 'PARIM-1002',
      name: 'Amina Khan',
      relationship: 'Mother',
      phone: '+447700922222',
      email: 'amina.khan@example.com',
      is_primary: 'true',
    },
    {
      parim_staff_id: 'PARIM-1003',
      name: 'Grace Mensah',
      relationship: 'Spouse',
      phone: '+447700933333',
      email: 'grace.mensah@example.com',
      is_primary: 'true',
    },
  ])

  const bank = XLSX.utils.json_to_sheet([
    {
      parim_staff_id: 'PARIM-1001',
      account_holder_name: 'Ali Raza',
      bank_account_number: '12345678',
      sort_code: '12-34-56',
      reference_number: 'BANK-1001',
      bank_name: 'Barclays',
      country: 'United Kingdom',
    },
    {
      parim_staff_id: 'PARIM-1002',
      account_holder_name: 'Sarah Khan',
      bank_account_number: '23456789',
      sort_code: '23-45-67',
      reference_number: 'BANK-1002',
      bank_name: 'HSBC',
      country: 'United Kingdom',
    },
    {
      parim_staff_id: 'PARIM-1003',
      account_holder_name: 'John Mensah',
      bank_account_number: '34567890',
      sort_code: '34-56-78',
      reference_number: 'BANK-1003',
      bank_name: 'Lloyds',
      country: 'United Kingdom',
    },
  ])

  const ids = XLSX.utils.json_to_sheet([
    {
      parim_staff_id: 'PARIM-1001',
      id_number: 'ID-1001',
      issue_date: '2026-04-01',
      expiry_date: '2027-04-01',
      site_name: 'HQ',
      role_title: 'Door Supervisor',
      sia_number: 'SIA-100001',
      qr_token: '',
      watermark_text: '',
      status: 'active',
    },
    {
      parim_staff_id: 'PARIM-1002',
      id_number: 'ID-1002',
      issue_date: '2026-04-10',
      expiry_date: '2027-04-10',
      site_name: 'Site A',
      role_title: 'Security Officer',
      sia_number: 'SIA-100002',
      qr_token: '',
      watermark_text: '',
      status: 'active',
    },
    {
      parim_staff_id: 'PARIM-1003',
      id_number: 'ID-1003',
      issue_date: '2026-03-01',
      expiry_date: '2027-03-01',
      site_name: 'Site B',
      role_title: 'CCTV Operator',
      sia_number: 'SIA-100003',
      qr_token: '',
      watermark_text: '',
      status: 'active',
    },
  ])

  const documents = XLSX.utils.json_to_sheet([
    {
      parim_staff_id: 'PARIM-1001',
      document_type_code: 'passport',
      document_type_name: 'Passport',
      custom_document_name: '',
      custom_document_code: '',
      document_number: 'P1234567',
      issue_date: '2025-01-01',
      expiry_date: '2035-01-01',
      status: 'pending',
      verified: 'false',
      file_url: '',
      notes: 'Standard document example',
      has_expiry: 'true',
    },
    {
      parim_staff_id: 'PARIM-1002',
      document_type_code: 'right_to_work',
      document_type_name: 'Right to Work',
      custom_document_name: '',
      custom_document_code: '',
      document_number: 'RTW-1002',
      issue_date: '2026-01-01',
      expiry_date: '2028-01-01',
      status: 'pending',
      verified: 'false',
      file_url: '',
      notes: '',
      has_expiry: 'true',
    },
    {
      parim_staff_id: 'PARIM-1003',
      document_type_code: '',
      document_type_name: '',
      custom_document_name: 'Utility Bill',
      custom_document_code: 'utility_bill',
      document_number: 'UB-1003',
      issue_date: '2026-02-01',
      expiry_date: '',
      status: 'pending',
      verified: 'false',
      file_url: '',
      notes: 'Custom document example',
      has_expiry: 'false',
    },
  ])

  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions')
  XLSX.utils.book_append_sheet(workbook, staff, 'Staff')
  XLSX.utils.book_append_sheet(workbook, employment, 'Employment')
  XLSX.utils.book_append_sheet(workbook, address, 'CurrentAddress')
  XLSX.utils.book_append_sheet(workbook, emergency, 'EmergencyContacts')
  XLSX.utils.book_append_sheet(workbook, bank, 'BankDetails')
  XLSX.utils.book_append_sheet(workbook, ids, 'DigitalIDs')
  XLSX.utils.book_append_sheet(workbook, documents, 'Documents')

  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="staff-bulk-upload-template.xlsx"',
    },
  })
}