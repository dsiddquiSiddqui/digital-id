import { randomBytes, randomUUID } from 'node:crypto'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('Supabase URL, anon key, and service-role key are required.')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO = {
  organizationName: 'Northstar Security Group (Demo)',
  slug: 'northstar-security-demo',
  email: 'demo.admin@digitalidx-showcase.com',
  ownerName: 'Alex Morgan',
  password: `DxDemo!${randomBytes(9).toString('base64url')}`,
}

const now = new Date()
const isoDays = (days) => new Date(now.getTime() + days * 86_400_000).toISOString()
const dateDays = (days) => isoDays(days).slice(0, 10)

async function insert(table, rows, columns = '*') {
  const { data, error } = await admin
    .from(table)
    .insert(rows, { defaultToNull: false })
    .select(columns)
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

async function assertUnused() {
  const [{ data: organization, error: organizationError }, { data: profile, error: profileError }] =
    await Promise.all([
      admin.from('organizations').select('id').eq('slug', DEMO.slug).maybeSingle(),
      admin.from('profiles').select('id').eq('email', DEMO.email).maybeSingle(),
    ])

  if (organizationError) throw organizationError
  if (profileError) throw profileError
  if (organization || profile) {
    throw new Error('The demo organization or login already exists. No data was changed.')
  }
}

async function seed() {
  await assertUnused()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: DEMO.email,
    password: DEMO.password,
    email_confirm: true,
    user_metadata: {
      full_name: DEMO.ownerName,
      role: 'admin',
      organization_slug: DEMO.slug,
      demo_account: true,
    },
    app_metadata: { demo_account: true },
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Unable to create the demo login.')
  }

  const authUserId = authData.user.id
  let organizationId

  try {
    const [organization] = await insert('organizations', {
      name: DEMO.organizationName,
      slug: DEMO.slug,
      status: 'active',
      plan: 'growth',
      theme_key: 'command-blue',
      primary_color: '#315c2b',
      accent_color: '#171915',
      surface_color: '#f3f1eb',
      storage_quota_mb: 5120,
      support_email: 'support@northstar-demo.example.com',
      support_phone: '+44 20 7946 0900',
      verification_title: 'Northstar Verified Staff',
      role_permissions: {
        hr_manager: ['staff.read', 'staff.write', 'documents.approve', 'reports.read'],
        operation_manager: ['staff.read', 'ids.read', 'alerts.read'],
      },
      onboarding_state: { company: true, team: true, branding: true, security: true },
      onboarding_wizard_state: { workspace: true, team: true, documents: true, ids: true, launch: true },
      launch_checklist_state: { data_reviewed: true, permissions_reviewed: true, billing_ready: true },
      ui_polish_state: { mobile_reviewed: true, accessibility_reviewed: true, microcopy_reviewed: true, performance_reviewed: true },
      production_readiness_state: { database: 'ready', auth: 'ready', email: 'configured', storage: 'ready' },
      require_2fa: false,
      device_tracking_enabled: true,
      rate_limit_enabled: true,
      session_history_enabled: true,
      session_timeout_minutes: 480,
      billing_provider: 'manual',
      email_from_name: 'Northstar Security',
      email_from_address: 'identity@northstar-demo.example.com',
      backup_policy: { frequency: 'daily', retention_days: 30, last_export_at: isoDays(-1) },
      compliance_policy: { require_document_approval: true, allow_staff_self_service: true, allow_staff_id_download: true },
      id_card_template: {
        layout: 'classic', orientation: 'portrait', primaryColor: '#171915', accentColor: '#c8ff4d',
        showLogo: true, showQr: true, showSia: true, showIssueDate: true, showExpiryDate: true,
        footerText: 'Verified by Digital ID X', headerText: 'Northstar Staff ID',
      },
    }, 'id, slug')
    organizationId = organization.id

    const profileRows = await insert('profiles', [
      { organization_id: organizationId, auth_user_id: authUserId, role: 'admin', full_name: DEMO.ownerName, email: DEMO.email, phone: '+44 7700 900001', is_active: true },
      { organization_id: organizationId, role: 'hr_manager', full_name: 'Priya Shah', email: 'priya.shah@northstar-demo.example.com', phone: '+44 7700 900002', is_active: true },
      { organization_id: organizationId, role: 'operation_manager', full_name: 'Jordan Ellis', email: 'jordan.ellis@northstar-demo.example.com', phone: '+44 7700 900003', is_active: true },
      { organization_id: organizationId, role: 'manager', full_name: 'Sam Bennett', email: 'sam.bennett@northstar-demo.example.com', phone: '+44 7700 900004', is_active: true },
      { organization_id: organizationId, role: 'hr', full_name: 'Taylor Reed', email: 'taylor.reed@northstar-demo.example.com', phone: '+44 7700 900005', is_active: false },
    ], 'id, role, full_name')

    const owner = profileRows[0]
    const hrManager = profileRows[1]
    const operationsManager = profileRows[2]

    const positions = await insert('positions', [
      { organization_id: organizationId, name: 'Security Officer', department: 'Operations', sector: 'Corporate', requires_sia: true },
      { organization_id: organizationId, name: 'Site Supervisor', department: 'Operations', sector: 'Retail', requires_sia: true },
      { organization_id: organizationId, name: 'Control Room Operator', department: 'Control', sector: 'Corporate', requires_sia: false },
      { organization_id: organizationId, name: 'Event Steward', department: 'Events', sector: 'Events', requires_sia: false },
    ], 'id, name')

    const sites = await insert('sites', [
      { organization_id: organizationId, code: 'LDN-HQ', name: 'Northstar London HQ', client_name: 'Northstar Group', address: '10 Meridian Square', city: 'London', region: 'Greater London', sector: 'Corporate', status: 'active', notes: '24/7 flagship site.' },
      { organization_id: organizationId, code: 'MAN-RC', name: 'Riverside Retail Centre', client_name: 'Riverside Estates', address: '82 Bridge Street', city: 'Manchester', region: 'North West', sector: 'Retail', status: 'active', notes: 'High-footfall retail contract.' },
      { organization_id: organizationId, code: 'BHM-EV', name: 'Birmingham Events Arena', client_name: 'Arena Live', address: '4 Central Way', city: 'Birmingham', region: 'West Midlands', sector: 'Events', status: 'active', notes: 'Event staffing and access control.' },
    ], 'id, name')

    const staffSeed = [
      ['NS-1001', 'Maya Thompson', 'maya.thompson', 'active', 'security', 'British', true, true],
      ['NS-1002', 'Owen Clarke', 'owen.clarke', 'active', 'security', 'Irish', true, true],
      ['NS-1003', 'Aisha Rahman', 'aisha.rahman', 'active', 'admin', 'British', false, true],
      ['NS-1004', 'Leo Martin', 'leo.martin', 'active', 'warehouse', 'French', true, true],
      ['NS-1005', 'Sofia Patel', 'sofia.patel', 'active', 'event', 'British', false, false],
      ['NS-1006', 'Noah Williams', 'noah.williams', 'active', 'contractor', 'Welsh', true, true],
      ['NS-1007', 'Isla Campbell', 'isla.campbell', 'active', 'security', 'Scottish', true, true],
      ['NS-1008', 'Ethan Brown', 'ethan.brown', 'active', 'security', 'British', false, false],
      ['NS-1009', 'Grace Kim', 'grace.kim', 'inactive', 'admin', 'British', true, true],
      ['NS-1010', 'Daniel Okafor', 'daniel.okafor', 'suspended', 'security', 'Nigerian', true, true],
      ['NS-1011', 'Emily Chen', 'emily.chen', 'expired', 'contractor', 'British', false, false],
      ['NS-1012', 'Lucas Silva', 'lucas.silva', 'archived', 'event', 'Portuguese', true, true],
    ]

    const staffRows = await insert('staff', staffSeed.map((item, index) => {
      const [employeeCode, fullName, emailName, status, staffType, nationality, accessToCar, driverLicence] = item
      const [firstName, ...lastParts] = fullName.split(' ')
      return {
        organization_id: organizationId,
        employee_code: employeeCode,
        full_name: fullName,
        first_name: firstName,
        last_name: lastParts.join(' '),
        phone: `+44 7700 91${String(index + 1).padStart(4, '0')}`,
        email: `${emailName}@northstar-demo.example.com`,
        company_name: 'Northstar Security Group',
        status,
        staff_type: staffType,
        nationality,
        country_of_birth: index % 3 === 0 ? 'United Kingdom' : nationality,
        gender: index % 2 === 0 ? 'Female' : 'Male',
        date_of_birth: `${1984 + index}-0${(index % 8) + 1}-15`,
        access_to_car: accessToCar,
        driver_licence: driverLicence,
        emergency_contact_name: `Demo Contact ${index + 1}`,
        emergency_contact_phone: `+44 7700 92${String(index + 1).padStart(4, '0')}`,
        import_source: index > 8 ? 'bulk_upload' : 'manual',
        notes: index === 9 ? 'Demo suspension pending compliance review.' : 'Fictional record created for the Digital ID X product showcase.',
      }
    }), 'id, employee_code, full_name, status')

    await insert('staff_employment', staffRows.map((staff, index) => ({
      organization_id: organizationId, staff_id: staff.id, employment_type: index % 4 === 0 ? 'Contractor' : 'Permanent',
      contract_number: `CTR-${2026}-${String(index + 1).padStart(3, '0')}`, contract_start: dateDays(-720 + index * 30),
      contract_end: index % 4 === 0 ? dateDays(180 + index * 10) : null, pay_schedule: 'Monthly',
      payroll_reference: `PAY-${staff.employee_code}`, tax_code: '1257L', ni_number: `QQ1234${String(index).padStart(2, '0')}C`,
      personal_pay_rate: 14.5 + index * 0.75, contracted_hours: index % 4 === 0 ? 24 : 40, holiday_entitlement: '28 days',
      is_current: !['archived'].includes(staff.status), notes: 'Fictional demo employment data.',
    })))

    await insert('staff_addresses', staffRows.map((staff, index) => ({
      organization_id: organizationId, staff_id: staff.id, house_no: String(20 + index), street_address: `${20 + index} Example Road`,
      city: ['London', 'Manchester', 'Birmingham'][index % 3], county: ['Greater London', 'Greater Manchester', 'West Midlands'][index % 3],
      post_code: `DX${(index % 8) + 1} ${index + 1}AA`, country: 'United Kingdom', is_current: true,
    })))

    await insert('staff_emergency_contacts', staffRows.map((staff, index) => ({
      organization_id: organizationId, staff_id: staff.id, name: `Emergency Contact ${index + 1}`,
      relationship: index % 2 === 0 ? 'Partner' : 'Sibling', phone: `+44 7700 93${String(index + 1).padStart(4, '0')}`,
      email: `contact${index + 1}@example.com`, is_primary: true,
    })))

    await insert('staff_bank_details', staffRows.slice(0, 8).map((staff, index) => ({
      organization_id: organizationId, staff_id: staff.id, account_holder_name: staff.full_name,
      bank_account_number: `0000${String(index + 1).padStart(4, '0')}`, sort_code: '00-00-00',
      reference_number: `DEMO-${staff.employee_code}`, bank_name: 'Demo Bank', country: 'United Kingdom', is_current: true,
    })))

    await insert('staff_positions', staffRows.map((staff, index) => ({
      organization_id: organizationId, staff_id: staff.id, position_id: positions[index % positions.length].id,
      start_date: dateDays(-600 + index * 20), is_primary: true,
    })))

    await insert('staff_site_assignments', staffRows.map((staff, index) => ({
      organization_id: organizationId, staff_id: staff.id, site_id: sites[index % sites.length].id,
      assignment_type: index % 3 === 0 ? 'Primary' : 'Relief', is_primary: index % 3 === 0,
      start_date: dateDays(-365 + index * 12), status: ['archived', 'expired'].includes(staff.status) ? 'ended' : 'active',
      notes: 'Demo site assignment.',
    })))

    const documentTypes = await insert('document_types', [
      { organization_id: organizationId, code: 'SIA', name: 'SIA Licence', has_expiry: true, is_mandatory: true, staff_type_scope: 'security' },
      { organization_id: organizationId, code: 'RTW', name: 'Right to Work', has_expiry: true, is_mandatory: true },
      { organization_id: organizationId, code: 'PASS', name: 'Passport', has_expiry: true, is_mandatory: true },
      { organization_id: organizationId, code: 'FAID', name: 'First Aid Certificate', has_expiry: true, is_mandatory: false },
      { organization_id: organizationId, code: 'CONT', name: 'Employment Contract', has_expiry: false, is_mandatory: true },
    ], 'id, code, name')

    const staffDocuments = await insert('staff_documents', staffRows.flatMap((staff, index) => {
      const expiryOffset = index === 10 ? -20 : index % 4 === 0 ? 18 : 260 + index * 10
      return [
        { organization_id: organizationId, staff_id: staff.id, document_type_id: documentTypes[0].id, document_number: `SIA-DEMO-${100000 + index}`, issue_date: dateDays(-700), expiry_date: dateDays(expiryOffset), status: expiryOffset < 0 ? 'expired' : 'valid', verified: index !== 9, verified_by: owner.id, verified_at: isoDays(-40), approval_status: index === 9 ? 'pending' : 'approved', approved_by: index === 9 ? null : hrManager.id, approved_at: index === 9 ? null : isoDays(-38), has_expiry: true, show_on_staff_panel: true, notes: 'Fictional demo licence.' },
        { organization_id: organizationId, staff_id: staff.id, document_type_id: documentTypes[1].id, document_number: `RTW-${staff.employee_code}`, issue_date: dateDays(-500), expiry_date: dateDays(500), status: 'valid', verified: true, verified_by: hrManager.id, verified_at: isoDays(-60), approval_status: 'approved', approved_by: hrManager.id, approved_at: isoDays(-59), has_expiry: true, show_on_staff_panel: false },
        { organization_id: organizationId, staff_id: staff.id, document_type_id: documentTypes[4].id, document_number: `CON-${staff.employee_code}`, issue_date: dateDays(-450), status: index === 11 ? 'missing' : 'valid', verified: index !== 11, verified_by: index === 11 ? null : owner.id, verified_at: index === 11 ? null : isoDays(-100), approval_status: index === 11 ? 'pending' : 'approved', has_expiry: false, show_on_staff_panel: false },
      ]
    }), 'id, staff_id, document_type_id, expiry_date, status')

    await insert('staff_training_records', staffRows.flatMap((staff, index) => [
      { organization_id: organizationId, staff_id: staff.id, training_name: 'Conflict Management', provider: 'Northstar Academy', completed_date: dateDays(-220), expiry_date: dateDays(index % 5 === 0 ? 25 : 510), status: 'valid', notes: 'Demo training record.' },
      { organization_id: organizationId, staff_id: staff.id, training_name: 'Data Protection Essentials', provider: 'Digital ID X Learning', completed_date: dateDays(-90), expiry_date: dateDays(275), status: index === 9 ? 'pending' : 'valid' },
    ]))

    const staffIds = await insert('staff_ids', staffRows.slice(0, 10).map((staff, index) => ({
      organization_id: organizationId, staff_id: staff.id, id_number: `DX-NS-${String(index + 1).padStart(5, '0')}`,
      issue_date: dateDays(-300 + index * 5), expiry_date: dateDays(index === 9 ? -5 : index % 4 === 0 ? 28 : 365 + index * 15),
      site_name: sites[index % sites.length].name, role_title: positions[index % positions.length].name,
      sia_number: `SIA-${900000 + index}`, qr_token: `northstar-demo-${randomUUID()}`, watermark_text: 'NORTHSTAR DEMO',
      is_current: index !== 9, created_by: owner.id, status: index === 9 ? 'expired' : 'active',
    })), 'id, staff_id, qr_token, status')

    // The deployed devices trigger currently references new.staff_id even though
    // this table uses guard_id. Security events remain useful without device_id.
    await insert('security_events', [
      { organization_id: organizationId, guard_id: staffRows[9].id, event_type: 'new_device_login', event_payload: { device_name: 'Demo Android', location: 'Unknown', demo: true }, severity: 'high', created_at: isoDays(-1) },
      { organization_id: organizationId, guard_id: staffRows[1].id, event_type: 'screenshot_attempt', event_payload: { device_name: 'Demo Galaxy', page: '/my-id', demo: true }, severity: 'medium', created_at: isoDays(-2), reviewed_by: operationsManager.id, reviewed_at: isoDays(-1) },
      { organization_id: organizationId, guard_id: staffRows[3].id, event_type: 'multiple_failed_logins', event_payload: { device_name: 'Demo Android', attempts: 5, demo: true }, severity: 'critical', created_at: isoDays(-4) },
      { organization_id: organizationId, guard_id: staffRows[0].id, event_type: 'screen_recording_detected', event_payload: { device_name: 'Demo iPhone', demo: true }, severity: 'low', created_at: isoDays(-8), reviewed_by: owner.id, reviewed_at: isoDays(-7) },
    ])

    await insert('audit_logs', [
      ['organization_created', 'organization', organizationId, { demo: true }],
      ['staff_created', 'staff', staffRows[0].id, { employee_code: 'NS-1001' }],
      ['staff_created', 'staff', staffRows[1].id, { employee_code: 'NS-1002' }],
      ['document_approved', 'staff_document', staffDocuments[0].id, { document_type: 'SIA' }],
      ['id_issued', 'staff_id', staffIds[0].id, { id_number: 'DX-NS-00001' }],
      ['role_updated', 'profile', hrManager.id, { role: 'hr_manager' }],
      ['staff_suspended', 'staff', staffRows[9].id, { reason: 'Compliance review' }],
      ['settings_updated', 'organization', organizationId, { area: 'branding' }],
      ['report_exported', 'organization', organizationId, { format: 'csv' }],
      ['security_event_reviewed', 'staff', staffRows[1].id, { severity: 'medium' }],
    ].map(([action_type, entity_type, entity_id, metadata], index) => ({ organization_id: organizationId, actor_profile_id: index % 3 === 0 ? hrManager.id : owner.id, action_type, entity_type, entity_id, metadata, created_at: isoDays(-index) })))

    await insert('id_verification_logs', staffIds.slice(0, 7).map((record, index) => ({
      organization_id: organizationId, staff_id: record.staff_id, staff_id_record: record.id, qr_token: record.qr_token,
      verified_at: isoDays(-index), result: index === 6 ? 'invalid' : 'valid', verified_by_profile_id: owner.id,
      ip_address: '192.0.2.10', user_agent: 'Digital ID X Demo Browser', notes: 'Fictional verification event.',
    })))

    const [importBatch] = await insert('staff_import_batches', {
      organization_id: organizationId, source: 'csv', file_name: 'northstar-demo-staff.csv', uploaded_by: hrManager.id,
      status: 'completed', total_rows: 12, processed_rows: 11, failed_rows: 1, created_at: isoDays(-14), completed_at: isoDays(-14),
    }, 'id')
    await insert('staff_import_rows', staffRows.slice(8).map((staff, index) => ({
      organization_id: organizationId, batch_id: importBatch.id, row_number: index + 2,
      raw_data: { employee_code: staff.employee_code, full_name: staff.full_name }, processed: index !== 3,
      processing_errors: index === 3 ? ['Duplicate demo reference'] : null, matched_staff_id: index === 3 ? null : staff.id,
    })))

    await insert('screenshot_alerts', [
      { organization_id: organizationId, profile_id: owner.id, staff_id: staffRows[1].id, full_name: staffRows[1].full_name, email: 'owen.clarke@northstar-demo.example.com', role: 'security', page: '/my-id', alert_type: 'screenshot_attempt', user_agent: 'Demo iPhone' },
      { organization_id: organizationId, profile_id: operationsManager.id, staff_id: staffRows[3].id, full_name: staffRows[3].full_name, email: 'leo.martin@northstar-demo.example.com', role: 'warehouse', page: '/my-id', alert_type: 'screen_recording', user_agent: 'Demo Android' },
    ])

    await insert('organization_subscriptions', { organization_id: organizationId, provider: 'manual', provider_customer_id: 'demo-customer-northstar', provider_subscription_id: 'demo-subscription-growth', status: 'active', plan: 'growth', current_period_end: isoDays(24) })

    await insert('notifications', [
      { organization_id: organizationId, profile_id: owner.id, type: 'document_expiry', title: '4 documents expire soon', body: 'Review licences expiring within the next 30 days.', severity: 'warning', action_url: '/expiry-alerts' },
      { organization_id: organizationId, profile_id: owner.id, type: 'security', title: 'New device login needs review', body: 'A high-risk device event was detected.', severity: 'critical', action_url: '/alerts' },
      { organization_id: organizationId, profile_id: owner.id, type: 'staff', title: 'Bulk import completed', body: '11 of 12 demo staff rows were imported.', severity: 'success', action_url: '/imports', read_at: isoDays(-2) },
      { organization_id: organizationId, profile_id: hrManager.id, type: 'renewal', title: 'Renewal submitted', body: 'Maya Thompson submitted an updated SIA licence.', severity: 'info', action_url: '/document-renewals' },
      { organization_id: organizationId, profile_id: owner.id, type: 'billing', title: 'Invoice paid', body: 'The August demo invoice has been paid.', severity: 'success', action_url: '/billing', read_at: isoDays(-8) },
    ])

    await insert('staff_document_renewal_requests', [
      { organization_id: organizationId, staff_id: staffRows[0].id, document_id: staffDocuments[0].id, document_type_id: documentTypes[0].id, submitted_by: hrManager.id, status: 'pending', document_number: 'SIA-DEMO-100000-R', issue_date: dateDays(-5), expiry_date: dateDays(1090), notes: 'Replacement licence uploaded for review.' },
      { organization_id: organizationId, staff_id: staffRows[4].id, document_id: staffDocuments[12].id, document_type_id: documentTypes[0].id, submitted_by: hrManager.id, reviewed_by: owner.id, status: 'approved', document_number: 'SIA-DEMO-100004-R', issue_date: dateDays(-20), expiry_date: dateDays(1080), review_notes: 'Demo renewal approved.', reviewed_at: isoDays(-2) },
      { organization_id: organizationId, staff_id: staffRows[9].id, document_id: staffDocuments[27].id, document_type_id: documentTypes[0].id, submitted_by: hrManager.id, reviewed_by: owner.id, status: 'rejected', document_number: 'SIA-DEMO-100009-R', issue_date: dateDays(-10), expiry_date: dateDays(1060), review_notes: 'Image quality insufficient.', reviewed_at: isoDays(-1) },
    ])

    await insert('user_invitations', [
      { organization_id: organizationId, invited_by: owner.id, email: 'new.manager@northstar-demo.example.com', full_name: 'Robin Foster', role: 'manager', token: `demo-invite-${randomUUID()}`, status: 'pending', expires_at: isoDays(6) },
      { organization_id: organizationId, invited_by: owner.id, email: 'new.hr@northstar-demo.example.com', full_name: 'Casey Young', role: 'hr', token: `demo-invite-${randomUUID()}`, status: 'expired', expires_at: isoDays(-2) },
    ])

    await insert('session_activity', [
      { organization_id: organizationId, profile_id: owner.id, device_name: 'Chrome on Windows', ip_address: '192.0.2.20', user_agent: 'Digital ID X Demo Browser', location_label: 'London, UK', last_seen_at: isoDays(0) },
      { organization_id: organizationId, profile_id: hrManager.id, device_name: 'Safari on iPad', ip_address: '192.0.2.21', user_agent: 'Digital ID X Demo Tablet', location_label: 'Manchester, UK', last_seen_at: isoDays(-1) },
    ])

    const fileAssets = await insert('file_assets', [
      { organization_id: organizationId, uploaded_by: owner.id, bucket: 'documents', path: `${organizationId}/demo/sia-licence.pdf`, content_type: 'application/pdf', size_bytes: 248000, purpose: 'staff_document', visibility: 'private' },
      { organization_id: organizationId, uploaded_by: hrManager.id, bucket: 'exports', path: `${organizationId}/demo/staff-export.csv`, content_type: 'text/csv', size_bytes: 18240, purpose: 'export', visibility: 'private', expires_at: isoDays(7) },
    ], 'id')

    await insert('email_delivery_logs', [
      { organization_id: organizationId, profile_id: owner.id, template_key: 'welcome', recipient_email: 'maya.thompson@northstar-demo.example.com', subject: 'Welcome to Northstar', provider: 'demo', provider_message_id: 'demo-msg-001', status: 'sent', metadata: { demo: true } },
      { organization_id: organizationId, profile_id: hrManager.id, template_key: 'document_expiry', recipient_email: 'sofia.patel@northstar-demo.example.com', subject: 'Your SIA licence expires soon', provider: 'demo', provider_message_id: 'demo-msg-002', status: 'sent', metadata: { days_remaining: 18 } },
      { organization_id: organizationId, profile_id: owner.id, template_key: 'invite', recipient_email: 'new.manager@northstar-demo.example.com', subject: 'You are invited to Northstar', provider: 'demo', status: 'queued', metadata: { demo: true } },
    ])

    await insert('billing_events', [
      { organization_id: organizationId, provider: 'manual', event_type: 'invoice.paid', provider_event_id: 'demo-event-001', status: 'processed', payload: { invoice: 'INV-DEMO-0826', amount: 149 } },
      { organization_id: organizationId, provider: 'manual', event_type: 'subscription.updated', provider_event_id: 'demo-event-002', status: 'processed', payload: { plan: 'growth' } },
    ])
    await insert('billing_invoices', [
      { organization_id: organizationId, provider: 'manual', provider_invoice_id: 'demo-invoice-001', invoice_number: 'INV-DEMO-0826', status: 'paid', amount_due: 149, currency: 'GBP', due_at: isoDays(-8), paid_at: isoDays(-10) },
      { organization_id: organizationId, provider: 'manual', provider_invoice_id: 'demo-invoice-002', invoice_number: 'INV-DEMO-0926', status: 'open', amount_due: 149, currency: 'GBP', due_at: isoDays(20) },
    ])
    await insert('export_requests', [
      { organization_id: organizationId, requested_by: owner.id, export_type: 'staff_directory', status: 'completed', row_count: 12 },
      { organization_id: organizationId, requested_by: hrManager.id, export_type: 'document_expiry', status: 'processing', row_count: 4 },
    ])
    await insert('legal_acceptances', { organization_id: organizationId, profile_id: owner.id, terms_version: '2026-06-25', privacy_version: '2026-06-25', accepted_ip: '192.0.2.20', user_agent: 'Digital ID X Demo Browser' })

    await insert('organization_domains', { organization_id: organizationId, domain: 'northstar-demo.digitalidx.test', status: 'verified', purpose: 'both', dns_target: 'digitalidx.app', dns_status: 'verified', ssl_status: 'active', cname_ok: true, txt_ok: true, last_checked_at: isoDays(0), verified_at: isoDays(-7) })

    const rules = await insert('workflow_automation_rules', [
      { organization_id: organizationId, name: '30-day document reminder', description: 'Notify HR and staff before licences expire.', trigger_type: 'document_expiring', conditions: { days_before: 30 }, actions: [{ type: 'notification' }, { type: 'email', template: 'document_expiry' }], is_active: true, last_run_at: isoDays(-1), created_by: owner.id, template_key: 'document_expiry', delay_minutes: 0, last_tested_at: isoDays(-2) },
      { organization_id: organizationId, name: 'Suspended staff escalation', description: 'Create a critical task when staff are suspended.', trigger_type: 'staff_status_changed', conditions: { to: 'suspended' }, actions: [{ type: 'admin_task', priority: 'critical' }], is_active: true, last_run_at: isoDays(-3), created_by: operationsManager.id, template_key: 'staff_status', delay_minutes: 0, last_tested_at: isoDays(-4) },
      { organization_id: organizationId, name: 'Pending invitation follow-up', description: 'Remind invited users after three days.', trigger_type: 'invite_pending', conditions: { days: 3 }, actions: [{ type: 'email', template: 'invite_reminder' }], is_active: false, created_by: owner.id, delay_minutes: 4320 },
    ], 'id')
    await insert('workflow_automation_runs', [
      { organization_id: organizationId, rule_id: rules[0].id, status: 'completed', matched_count: 4, action_count: 8, created_at: isoDays(-1) },
      { organization_id: organizationId, rule_id: rules[1].id, status: 'completed', matched_count: 1, action_count: 1, created_at: isoDays(-3) },
      { organization_id: organizationId, rule_id: rules[0].id, status: 'test_completed', matched_count: 2, action_count: 4, created_at: isoDays(-5) },
    ])

    await insert('bulk_action_batches', [
      { organization_id: organizationId, requested_by: hrManager.id, action_type: 'update_site', target_type: 'staff', target_count: 6, success_count: 6, failed_count: 0, status: 'completed', metadata: { site: 'LDN-HQ' }, completed_at: isoDays(-6), approval_status: 'approved', approved_by: owner.id, approved_at: isoDays(-6), rollback_until: isoDays(1) },
      { organization_id: organizationId, requested_by: operationsManager.id, action_type: 'suspend', target_type: 'staff', target_count: 1, success_count: 0, failed_count: 0, status: 'pending_approval', metadata: { reason: 'Compliance review' }, approval_status: 'pending' },
    ])

    await insert('admin_tasks', [
      { organization_id: organizationId, created_by: owner.id, assigned_to: hrManager.id, source_type: 'document_expiry', source_id: staffDocuments[0].id, title: 'Review Maya’s renewed SIA licence', description: 'Check the uploaded replacement and approve if valid.', status: 'in_progress', priority: 'high', due_at: isoDays(2) },
      { organization_id: organizationId, created_by: operationsManager.id, assigned_to: owner.id, source_type: 'security_event', title: 'Investigate untrusted device login', description: 'Confirm the device with the staff member.', status: 'open', priority: 'critical', due_at: isoDays(1) },
      { organization_id: organizationId, created_by: owner.id, assigned_to: hrManager.id, source_type: 'manual', title: 'Complete monthly compliance export', status: 'done', priority: 'normal', completed_at: isoDays(-3) },
    ])

    await insert('system_health_events', [
      { organization_id: organizationId, event_type: 'email_delivery', severity: 'success', title: 'Email provider healthy', body: 'Recent demo messages were delivered successfully.', status: 'resolved', resolved_at: isoDays(-1) },
      { organization_id: organizationId, event_type: 'storage_quota', severity: 'warning', title: 'Storage usage at 72%', body: 'Review large historical exports.', status: 'open', metadata: { usage_percent: 72 } },
      { organization_id: organizationId, event_type: 'backup', severity: 'success', title: 'Daily export completed', body: 'The latest scheduled data export completed.', status: 'resolved', resolved_at: isoDays(0) },
    ])
    await insert('id_card_exports', staffIds.slice(0, 3).map((idRecord, index) => ({ organization_id: organizationId, staff_id: idRecord.staff_id, exported_by: owner.id, export_type: index === 2 ? 'png' : 'pdf', status: 'completed', metadata: { demo: true, copies: 1 } })))

    await insert('email_templates', [
      { organization_id: organizationId, template_key: 'welcome', name: 'Staff welcome', subject: 'Welcome to Northstar Security', preview_text: 'Your secure staff identity is ready.', body_html: '<h1>Welcome to Northstar</h1><p>Your Digital ID X profile is ready.</p>', body_text: 'Welcome to Northstar. Your Digital ID X profile is ready.', created_by: owner.id },
      { organization_id: organizationId, template_key: 'document_expiry', name: 'Document expiry reminder', subject: 'Action required: document expiring soon', preview_text: 'Please renew your document.', body_html: '<h1>Document renewal required</h1><p>Please upload a valid replacement document.</p>', body_text: 'Please upload a valid replacement document.', created_by: hrManager.id },
      { organization_id: organizationId, template_key: 'invite', name: 'Workspace invitation', subject: 'Join Northstar on Digital ID X', preview_text: 'Your workspace invitation is ready.', body_html: '<h1>You are invited</h1><p>Join the Northstar identity workspace.</p>', body_text: 'Join the Northstar identity workspace.', created_by: owner.id },
    ])

    await insert('support_tickets', [
      { organization_id: organizationId, created_by_profile_id: hrManager.id, assigned_to_profile_id: owner.id, subject: 'Bulk upload field mapping question', message: 'How should a custom payroll reference be mapped?', category: 'imports', priority: 'normal', status: 'in_progress', response_summary: 'Use the payroll_reference column in the template.', metadata: { demo: true } },
      { organization_id: organizationId, created_by_profile_id: operationsManager.id, assigned_to_profile_id: owner.id, subject: 'Mobile ID not refreshing', message: 'A demo device shows an older ID status.', category: 'digital_ids', priority: 'high', status: 'resolved', response_summary: 'The device was refreshed and the current ID loaded.', resolved_at: isoDays(-2), metadata: { demo: true } },
    ])

    await insert('production_provider_configs', [
      { organization_id: organizationId, provider_area: 'email', provider_name: 'Demo SMTP', status: 'verified', public_config: { sender: 'identity@northstar-demo.example.com' }, last_checked_at: isoDays(0) },
      { organization_id: organizationId, provider_area: 'storage', provider_name: 'Supabase Storage', status: 'verified', public_config: { bucket: 'documents' }, last_checked_at: isoDays(0) },
      { organization_id: organizationId, provider_area: 'billing', provider_name: 'Manual Demo Billing', status: 'configured', public_config: { currency: 'GBP' }, last_checked_at: isoDays(-1) },
    ])
    await insert('monitoring_checks', [
      { organization_id: organizationId, check_key: 'public_verification', name: 'Public verification page', target_url: 'https://digitalidx.app/verify/demo', expected_status: 200, status: 'up', last_checked_at: isoDays(0), last_response_ms: 184 },
      { organization_id: organizationId, check_key: 'staff_api', name: 'Staff API', target_url: 'https://digitalidx.app/api/v2/staff/demo', expected_status: 401, status: 'up', last_checked_at: isoDays(0), last_response_ms: 96 },
      { organization_id: organizationId, check_key: 'email_delivery', name: 'Email delivery', target_url: 'https://digitalidx.app/api/health/email', expected_status: 200, status: 'degraded', last_checked_at: isoDays(-1), last_response_ms: 820, last_error: 'Demo latency threshold exceeded.' },
    ])
    await insert('report_schedules', [
      { organization_id: organizationId, name: 'Weekly compliance summary', report_type: 'compliance', format: 'pdf', cron_expression: '0 8 * * 1', recipients: [DEMO.email, 'priya.shah@northstar-demo.example.com'], is_enabled: true, last_sent_at: isoDays(-3), metadata: { include_expiring: true } },
      { organization_id: organizationId, name: 'Monthly staff directory', report_type: 'staff_directory', format: 'csv', cron_expression: '0 7 1 * *', recipients: [DEMO.email], is_enabled: true, last_sent_at: isoDays(-20) },
    ])
    await insert('export_templates', [
      { organization_id: organizationId, template_key: 'branded_staff_id', name: 'Northstar Staff ID', export_type: 'id_card', format: 'pdf', brand_config: { primary: '#171915', accent: '#c8ff4d', logo: true }, is_default: true },
      { organization_id: organizationId, template_key: 'compliance_report', name: 'Compliance Board Pack', export_type: 'compliance', format: 'pdf', brand_config: { cover: true, confidential: true }, is_default: false },
    ])
    await insert('qa_review_items', [
      { organization_id: organizationId, category: 'accessibility', item_key: 'keyboard_navigation', title: 'Keyboard navigation reviewed', status: 'passed', evidence: 'Core demo flows tested with keyboard.', reviewed_by: owner.id, reviewed_at: isoDays(-2) },
      { organization_id: organizationId, category: 'security', item_key: 'tenant_isolation', title: 'Tenant isolation verified', status: 'passed', evidence: 'Organization-scoped RLS review complete.', reviewed_by: owner.id, reviewed_at: isoDays(-2) },
      { organization_id: organizationId, category: 'mobile', item_key: 'mobile_staff_flow', title: 'Mobile staff flow reviewed', status: 'pending' },
    ])
    await insert('app_test_runs', [
      { organization_id: organizationId, suite_name: 'Demo smoke suite', status: 'passed', summary: 'Login, dashboard, staff, documents, and reports passed.', metadata: { tests: 24, passed: 24 } },
      { organization_id: organizationId, suite_name: 'Mobile regression', status: 'pending', summary: 'Scheduled for the next design review.', metadata: { devices: ['iPhone', 'Android'] } },
    ])

    // Keep one document connected to a private asset so signed-file states render.
    const { error: documentUpdateError } = await admin.from('staff_documents').update({ file_asset_id: fileAssets[0].id }).eq('id', staffDocuments[0].id)
    if (documentUpdateError) throw new Error(`staff_documents update: ${documentUpdateError.message}`)

    const signInClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({ email: DEMO.email, password: DEMO.password })
    if (signInError || !signInData.user) throw new Error(signInError?.message || 'Demo login verification failed.')
    await signInClient.auth.signOut()

    const countTables = ['profiles', 'staff', 'staff_ids', 'staff_documents', 'staff_training_records', 'sites', 'security_events', 'audit_logs', 'notifications', 'staff_document_renewal_requests', 'workflow_automation_rules', 'admin_tasks', 'billing_invoices', 'support_tickets', 'monitoring_checks', 'report_schedules']
    const counts = {}
    for (const table of countTables) {
      const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      if (error) throw new Error(`${table} verification: ${error.message}`)
      counts[table] = count
    }

    console.log(JSON.stringify({
      ok: true,
      organization: DEMO.organizationName,
      slug: DEMO.slug,
      loginUrl: 'http://localhost:3000/login',
      email: DEMO.email,
      password: DEMO.password,
      organizationId,
      authUserId,
      counts,
    }, null, 2))
  } catch (error) {
    if (organizationId) {
      await admin.from('organizations').delete().eq('id', organizationId)
    }
    await admin.auth.admin.deleteUser(authUserId)
    throw error
  }
}

seed().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
