'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  CreditCard,
  TriangleAlert,
  ChevronRight,
  UserRound,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import IdCard from '@/components/IdCard'

type Staff = {
  id: string
  profile_id: string | null
  parim_staff_id: string | null
  employee_code: string
  full_name: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  second_phone: string | null
  company_name: string | null
  staff_type: string
  status: string
  photo_url: string | null
  nationality: string | null
  country_of_birth: string | null
  gender: string | null
  date_of_birth: string | null
  access_to_car: boolean | null
  driver_licence: boolean | null
  notes: string | null
  created_at: string
}

type StaffEmployment = {
  id: string
  staff_id: string
  employment_type: string | null
  contract_number: string | null
  contract_start: string | null
  contract_end: string | null
  pay_schedule: string | null
  payroll_reference: string | null
  tax_code: string | null
  ni_number: string | null
  personal_pay_rate: number | null
  is_current: boolean
}

type StaffAddress = {
  id: string
  staff_id: string
  street_address: string | null
  city: string | null
  post_code: string | null
  country: string | null
  is_current: boolean
}

type StaffEmergencyContact = {
  id: string
  name: string
  relationship: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
}

type StaffBankDetails = {
  id: string
  account_holder_name: string | null
  bank_account_number: string | null
  sort_code: string | null
  reference_number: string | null
  is_current?: boolean
}

type StaffIdRecord = {
  id: string
  id_number: string
  role_title: string
  site_name: string | null
  sia_number: string | null
  issue_date: string
  expiry_date: string
  is_current: boolean
  status: string
  qr_token: string
}

type StaffDocument = {
  id: string
  staff_id: string
  document_type_id: string
  document_number: string | null
  issue_date: string | null
  expiry_date: string | null
  status: string
  file_url: string | null
  notes: string | null
  created_at: string
  document_types?: {
    id: string
    code: string
    name: string
    has_expiry: boolean
  } | null
}

type StatusAction = {
  key: string
  label: string
  className: string
}

export default function V2StaffDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [statusLoading, setStatusLoading] = useState<string | null>(null)

  const [staff, setStaff] = useState<Staff | null>(null)
  const [employment, setEmployment] = useState<StaffEmployment | null>(null)
  const [address, setAddress] = useState<StaffAddress | null>(null)
  const [emergencyContact, setEmergencyContact] = useState<StaffEmergencyContact | null>(null)
  const [bankDetails, setBankDetails] = useState<StaffBankDetails | null>(null)
  const [currentId, setCurrentId] = useState<StaffIdRecord | null>(null)
  const [documents, setDocuments] = useState<StaffDocument[]>([])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')
      setMessage('')

      try {
        const [
          staffRes,
          employmentRes,
          bankRes,
          contactsRes,
          documentsRes,
          digitalIdRes,
          addressRes,
        ] = await Promise.all([
          fetch(`/api/v2/staff/${id}`),
          fetch(`/api/v2/staff/${id}/employment`),
          fetch(`/api/v2/staff/${id}/bank-details`),
          fetch(`/api/v2/staff/${id}/contacts`),
          fetch(`/api/v2/staff/${id}/documents`),
          fetch(`/api/v2/staff/${id}/digital-id`),
          fetch(`/api/v2/staff/${id}/address`),
        ])

        const staffJson = await staffRes.json()
        const employmentJson = await employmentRes.json()
        const bankJson = await bankRes.json()
        const contactsJson = await contactsRes.json()
        const documentsJson = await documentsRes.json()
        const digitalIdJson = await digitalIdRes.json()
        const addressJson = await addressRes.json()

        if (!staffRes.ok) {
          setError(staffJson.error || 'Staff member not found.')
          setLoading(false)
          return
        }

        setStaff((staffJson.staff as Staff | null) || null)
        setEmployment((employmentJson.employment as StaffEmployment | null) || null)
        setBankDetails((bankJson.bank_details as StaffBankDetails | null) || null)
        setDocuments((documentsJson.documents as StaffDocument[]) || [])
        setCurrentId((digitalIdJson.digital_id as StaffIdRecord | null) || null)
        setAddress((addressJson.address as StaffAddress | null) || null)

        const allContacts = (contactsJson.contacts as StaffEmergencyContact[]) || []
        const primaryContact =
          allContacts.find((contact) => contact.is_primary) || allContacts[0] || null

        setEmergencyContact(primaryContact)
        setLoading(false)
      } catch {
        setError('Something went wrong while loading staff profile.')
        setLoading(false)
      }
    }

    if (id) loadData()
  }, [id])

  const updateStatus = async (newStatus: string) => {
    if (!staff) return

    setStatusLoading(newStatus)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/update-staff-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.id,
          status: newStatus,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update status.')
        setStatusLoading(null)
        return
      }

      setStaff((prev) => (prev ? { ...prev, status: newStatus } : prev))
      setMessage(`Staff status updated to ${newStatus}.`)
    } catch {
      setError('Something went wrong while updating status.')
    } finally {
      setStatusLoading(null)
    }
  }

  const completion = useMemo(() => {
    if (!staff) return 0

    const checks = [
      !!staff.photo_url,
      !!staff.email,
      !!staff.phone,
      !!employment,
      !!address,
      !!emergencyContact,
      !!bankDetails,
      !!currentId,
      documents.length > 0,
    ]

    const complete = checks.filter(Boolean).length
    return Math.round((complete / checks.length) * 100)
  }, [staff, employment, address, emergencyContact, bankDetails, currentId, documents])

  const statusActions = useMemo<StatusAction[]>(() => {
    if (!staff?.status) return []

    const currentStatus = staff.status.toLowerCase()

    const actionMap: Record<string, StatusAction[]> = {
      active: [
        {
          key: 'suspended',
          label: 'Suspend',
          className:
            'bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer',
        },
        {
          key: 'revoked',
          label: 'Revoke',
          className:
            'bg-red-600 text-white hover:bg-red-700 cursor-pointer',
        },
      ],
      suspended: [
        {
          key: 'active',
          label: 'Activate',
          className:
            'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer',
        },
        {
          key: 'revoked',
          label: 'Revoke',
          className:
            'bg-red-600 text-white hover:bg-red-700 cursor-pointer',
        },
      ],
      revoked: [
        {
          key: 'active',
          label: 'Activate',
          className:
            'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer',
        },
      ],
      inactive: [
        {
          key: 'active',
          label: 'Activate',
          className:
            'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer',
        },
        {
          key: 'suspended',
          label: 'Suspend',
          className:
            'bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer',
        },
        {
          key: 'revoked',
          label: 'Revoke',
          className:
            'bg-red-600 text-white hover:bg-red-700 cursor-pointer',
        },
      ],
      archived: [
        {
          key: 'active',
          label: 'Activate',
          className:
            'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer',
        },
      ],
    }

    return actionMap[currentStatus] || []
  }, [staff?.status])

  const validDocuments = documents.filter((doc) => doc.status?.toLowerCase() === 'valid').length
  const problemDocuments = documents.filter((doc) =>
    ['expired', 'rejected', 'missing'].includes(doc.status?.toLowerCase())
  ).length
  const latestDocuments = documents.slice(0, 3)

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading staff profile...</p>
      </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-red-600">{error || 'Staff member not found.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
              {staff.photo_url ? (
                <Image
                  src={staff.photo_url}
                  alt={staff.full_name}
                  width={80}
                  height={80}
                  className="h-20 w-20 object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-500">
                  {staff.full_name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {staff.full_name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={staff.status} />
                <TypeBadge value={staff.staff_type} />
                {currentId ? (
                  <IdBadge status={currentId.status} />
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    No Active ID
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <InfoLine
                  icon={<UserRound className="h-4 w-4" />}
                  value={`Employee Code: ${staff.employee_code}`}
                />
                <InfoLine
                  icon={<Building2 className="h-4 w-4" />}
                  value={staff.company_name || 'No company set'}
                />
                <InfoLine
                  icon={<Mail className="h-4 w-4" />}
                  value={staff.email || 'No email'}
                />
                <InfoLine
                  icon={<Phone className="h-4 w-4" />}
                  value={staff.phone || 'No phone'}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/staff/${staff.id}/password`}
              className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reset Password
            </Link>

            <Link
              href={`/v2/staff/${staff.id}/edit`}
              className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Edit Staff
            </Link>

            {currentId ? (
              <Link
                href={`/staff-ids/${currentId.id}/edit`}
                className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Edit Digital ID
              </Link>
            ) : (
              <Link
                href={`/staff/${staff.id}/issue-id`}
                className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Issue Digital ID
              </Link>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <MiniStat title="Profile Completion" value={`${completion}%`} />
        <MiniStat title="Current ID" value={currentId ? currentId.id_number : 'Missing'} />
        <MiniStat title="Employment" value={employment?.employment_type || 'Missing'} />
        <MiniStat title="Emergency Contact" value={emergencyContact ? 'Added' : 'Missing'} />
        <MiniStat title="Documents" value={`${documents.length}`} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card
            title="Overview"
            action={
              <Link
                href={`/v2/staff/${staff.id}/edit`}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Manage
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoBox label="Full Name" value={staff.full_name} />
              <InfoBox label="Employee Code" value={staff.employee_code} />
              <InfoBox label="Staff Type" value={staff.staff_type} />
              <InfoBox label="Status" value={staff.status} />
              <InfoBox label="Company Name" value={staff.company_name || '—'} />
              <InfoBox label="PARiM Staff ID" value={staff.parim_staff_id || '—'} />
              <InfoBox label="Phone" value={staff.phone || '—'} />
              <InfoBox label="Second Phone" value={staff.second_phone || '—'} />
              <InfoBox label="Email" value={staff.email || '—'} />
              <InfoBox label="Nationality" value={staff.nationality || '—'} />
              <InfoBox label="Country of Birth" value={staff.country_of_birth || '—'} />
              <InfoBox label="Gender" value={staff.gender || '—'} />
            </div>
          </Card>

          <Card
            title="Employment"
            action={
              <Link
                href={`/v2/staff/${staff.id}/employment`}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Manage
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            {employment ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoBox label="Employment Type" value={employment.employment_type || '—'} />
                <InfoBox label="Contract Number" value={employment.contract_number || '—'} />
                <InfoBox label="Contract Start" value={employment.contract_start || '—'} />
                <InfoBox label="Contract End" value={employment.contract_end || '—'} />
                <InfoBox label="Pay Schedule" value={employment.pay_schedule || '—'} />
                <InfoBox label="Payroll Reference" value={employment.payroll_reference || '—'} />
                <InfoBox label="Tax Code" value={employment.tax_code || '—'} />
                <InfoBox label="NI Number" value={employment.ni_number || '—'} />
              </div>
            ) : (
              <EmptyState text="No employment record added yet." />
            )}
          </Card>

          <Card
            title="Documents"
            icon={<FileText className="h-5 w-5" />}
            action={
              <Link
                href={`/v2/staff/${staff.id}/documents`}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Manage
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            {documents.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <InfoBox label="Total Documents" value={String(documents.length)} />
                  <InfoBox label="Valid Documents" value={String(validDocuments)} />
                  <InfoBox label="Issues Found" value={String(problemDocuments)} />
                </div>

                <div className="space-y-3">
                  {latestDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {doc.document_types?.name || 'Document'}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Number: {doc.document_number || '—'}
                          </p>
                        </div>
                        <DocumentStatusBadge status={doc.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>Issue Date: {doc.issue_date || '—'}</p>
                        <p>Expiry Date: {doc.expiry_date || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="No documents added yet." />
            )}
          </Card>

          <Card
            title="Digital ID"
            icon={<ShieldCheck className="h-5 w-5" />}
            action={
              <Link
                href={currentId ? `/staff-ids/${currentId.id}/edit` : `/staff/${staff.id}/issue-id`}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Manage
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            {currentId ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoBox label="ID Number" value={currentId.id_number} />
                  <InfoBox label="Role Title" value={currentId.role_title} />
                  <InfoBox label="ID Status" value={currentId.status} />
                  <InfoBox label="Issue Date" value={currentId.issue_date} />
                  <InfoBox label="Expiry Date" value={currentId.expiry_date} />
                  <InfoBox label="SIA Number" value={currentId.sia_number || '—'} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-4 text-sm font-medium text-slate-700">
                    Digital ID Preview
                  </p>

                  <IdCard
                    fullName={staff.full_name}
                    employeeCode={staff.employee_code}
                    roleTitle={currentId.role_title}
                    idNumber={currentId.id_number}
                    siaNumber={currentId.sia_number}
                    qrToken={currentId.qr_token}
                    photoUrl={staff.photo_url}
                    issueDate={currentId.issue_date}
                    expiryDate={currentId.expiry_date}
                    idStatus={currentId.status}
                  />
                </div>
              </div>
            ) : (
              <EmptyState text="No current digital ID assigned yet." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status Actions">
            <div className="space-y-3">
              {statusActions.length > 0 ? (
                statusActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => updateStatus(action.key)}
                    disabled={statusLoading !== null}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
                  >
                    {statusLoading === action.key ? 'Updating...' : action.label}
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No other status actions available.
                </div>
              )}
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="grid grid-cols-1 gap-3">
              <Link
                href={`/v2/staff/${staff.id}/documents`}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Manage Documents
              </Link>

              <Link
                href={`/v2/staff/${staff.id}/employment`}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Manage Employment
              </Link>

              <Link
                href={`/v2/staff/${staff.id}/address`}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Manage Address
              </Link>

              <Link
                href={`/v2/staff/${staff.id}/contacts`}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Manage Emergency Contact
              </Link>

              <Link
                href={`/v2/staff/${staff.id}/bank-details`}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Manage Bank Details
              </Link>

              {currentId ? (
                <Link
                  href={`/staff-ids/${currentId.id}/edit`}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Manage Digital ID
                </Link>
              ) : (
                <Link
                  href={`/staff/${staff.id}/issue-id`}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Issue Digital ID
                </Link>
              )}
            </div>
          </Card>

          <Card
            title="Address"
            icon={<MapPin className="h-5 w-5" />}
            action={
              <Link
                href={`/v2/staff/${staff.id}/address`}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Manage
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            {address ? (
              <div className="space-y-3">
                <InfoBox label="Street Address" value={address.street_address || '—'} />
                <InfoBox label="City" value={address.city || '—'} />
                <InfoBox label="Post Code" value={address.post_code || '—'} />
                <InfoBox label="Country" value={address.country || '—'} />
              </div>
            ) : (
              <EmptyState text="No address record added yet." />
            )}
          </Card>

          <Card
            title="Emergency Contact"
            icon={<TriangleAlert className="h-5 w-5" />}
            action={
              <Link
                href={`/v2/staff/${staff.id}/contacts`}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Manage
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            {emergencyContact ? (
              <div className="space-y-3">
                <InfoBox label="Name" value={emergencyContact.name} />
                <InfoBox label="Relationship" value={emergencyContact.relationship || '—'} />
                <InfoBox label="Phone" value={emergencyContact.phone || '—'} />
                <InfoBox label="Email" value={emergencyContact.email || '—'} />
              </div>
            ) : (
              <EmptyState text="No emergency contact added yet." />
            )}
          </Card>

          <Card
            title="Bank Details"
            icon={<CreditCard className="h-5 w-5" />}
            action={
              <Link
                href={`/v2/staff/${staff.id}/bank-details`}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Manage
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            {bankDetails ? (
              <div className="space-y-3">
                <InfoBox label="Account Holder" value={bankDetails.account_holder_name || '—'} />
                <InfoBox
                  label="Account Number"
                  value={maskValue(bankDetails.bank_account_number)}
                />
                <InfoBox label="Sort Code" value={bankDetails.sort_code || '—'} />
                <InfoBox label="Reference Number" value={bankDetails.reference_number || '—'} />
              </div>
            ) : (
              <EmptyState text="No bank details added yet." />
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}

function Card({
  title,
  children,
  action,
  icon,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon ? <div className="text-slate-500">{icon}</div> : null}
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <span>{value}</span>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {text}
    </div>
  )
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()

  if (normalized === 'active') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        Active
      </span>
    )
  }
  if (normalized === 'inactive') {
    return (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
        Inactive
      </span>
    )
  }
  if (normalized === 'suspended') {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
        Suspended
      </span>
    )
  }
  if (normalized === 'revoked') {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        Revoked
      </span>
    )
  }
  if (normalized === 'archived') {
    return (
      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
        Archived
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {status}
    </span>
  )
}

function TypeBadge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
      {value || 'other'}
    </span>
  )
}

function IdBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()

  if (normalized === 'active') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        ID Active
      </span>
    )
  }
  if (normalized === 'suspended') {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
        ID Suspended
      </span>
    )
  }
  if (normalized === 'expired') {
    return (
      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
        ID Expired
      </span>
    )
  }
  if (normalized === 'revoked') {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        ID Revoked
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {status}
    </span>
  )
}

function DocumentStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()

  if (normalized === 'valid') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        Valid
      </span>
    )
  }
  if (normalized === 'expired') {
    return (
      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
        Expired
      </span>
    )
  }
  if (normalized === 'rejected') {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        Rejected
      </span>
    )
  }
  if (normalized === 'missing') {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
        Missing
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      Pending
    </span>
  )
}

function maskValue(value?: string | null) {
  if (!value) return '—'
  if (value.length <= 4) return value
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`
}