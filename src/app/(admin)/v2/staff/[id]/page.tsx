'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronRight, FileText, Mail, MapPin, Phone, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'
import IdCard from '@/components/IdCard'
import { useIdCardTemplate } from '@/hooks/use-id-card-template'

type Staff = { id: string; employee_code: string; full_name: string; email: string | null; phone: string | null; nationality: string | null; date_of_birth: string | null; photo_url: string | null; created_at: string }
type StaffEmployment = { employment_type: string | null; contract_number: string | null; contract_start: string | null; contract_end: string | null; pay_schedule: string | null; payroll_reference: string | null }
type StaffAddress = { street_address: string | null; city: string | null; post_code: string | null; country: string | null }
type StaffEmergencyContact = { name: string; relationship: string | null; phone: string | null; email: string | null; is_primary: boolean }
type StaffIdRecord = { id: string; id_number: string; role_title: string; sia_number: string | null; issue_date: string; expiry_date: string; status: string; qr_token: string }
type StaffDocument = { id: string; document_number: string | null; issue_date: string | null; expiry_date: string | null; status: string; created_at: string; document_types?: { name: string } | null }
type NextAction = { label: string; detail: string; href: string }

function formatUKDate(dateString?: string | null) {
  if (!dateString) return 'Not provided'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Not provided'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function titleCase(value?: string | null) {
  if (!value) return 'Not provided'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function V2StaffDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { template, organization } = useIdCardTemplate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [staff, setStaff] = useState<Staff | null>(null)
  const [employment, setEmployment] = useState<StaffEmployment | null>(null)
  const [address, setAddress] = useState<StaffAddress | null>(null)
  const [emergencyContact, setEmergencyContact] = useState<StaffEmergencyContact | null>(null)
  const [currentId, setCurrentId] = useState<StaffIdRecord | null>(null)
  const [documents, setDocuments] = useState<StaffDocument[]>([])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')
      try {
        const [staffRes, employmentRes, contactsRes, documentsRes, digitalIdRes, addressRes] = await Promise.all([
          fetch(`/api/v2/staff/${id}`),
          fetch(`/api/v2/staff/${id}/employment`),
          fetch(`/api/v2/staff/${id}/contacts`),
          fetch(`/api/v2/staff/${id}/documents`),
          fetch(`/api/v2/staff/${id}/digital-id`),
          fetch(`/api/v2/staff/${id}/address`),
        ])
        const [staffJson, employmentJson, contactsJson, documentsJson, digitalIdJson, addressJson] = await Promise.all([
          staffRes.json(), employmentRes.json(), contactsRes.json(), documentsRes.json(), digitalIdRes.json(), addressRes.json(),
        ])
        if (!staffRes.ok || !staffJson.staff) {
          setError(staffJson.error || 'Staff member not found.')
          return
        }
        setStaff(staffJson.staff as Staff)
        setEmployment((employmentJson.employment as StaffEmployment | null) || null)
        setDocuments((documentsJson.documents as StaffDocument[]) || [])
        setCurrentId((digitalIdJson.digital_id as StaffIdRecord | null) || null)
        setAddress((addressJson.address as StaffAddress | null) || null)
        const contacts = (contactsJson.contacts as StaffEmergencyContact[]) || []
        setEmergencyContact(contacts.find((contact) => contact.is_primary) || contacts[0] || null)
      } catch {
        setError('Something went wrong while loading this staff profile.')
      } finally {
        setLoading(false)
      }
    }
    if (id) void loadData()
  }, [id])

  const validDocuments = documents.filter((document) => document.status?.toLowerCase() === 'valid').length
  const problemDocuments = documents.filter((document) => ['expired', 'rejected', 'missing'].includes(document.status?.toLowerCase())).length
  const latestDocuments = documents.slice(0, 3)

  const completion = useMemo(() => {
    if (!staff) return 0
    const checks = [Boolean(staff.photo_url), Boolean(staff.email), Boolean(staff.phone), Boolean(staff.nationality), Boolean(staff.date_of_birth), Boolean(employment), Boolean(address), Boolean(emergencyContact)]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [address, emergencyContact, employment, staff])

  const documentReadiness = documents.length ? Math.round((validDocuments / documents.length) * 100) : 0
  const idReadiness = currentId ? (currentId.status.toLowerCase() === 'active' ? 100 : 50) : 0

  const nextActions = useMemo<NextAction[]>(() => {
    if (!staff) return []
    return [
      !currentId ? { label: 'Issue a Digital ID', detail: 'This person does not have an active identity credential.', href: `/v2/staff/${staff.id}/issue-id` } : null,
      !employment ? { label: 'Add employment details', detail: 'Contract and payroll information is incomplete.', href: `/v2/staff/${staff.id}/employment` } : null,
      !address ? { label: 'Add a residential address', detail: 'The contact record does not include an address.', href: `/v2/staff/${staff.id}/address` } : null,
      !emergencyContact ? { label: 'Add an emergency contact', detail: 'No emergency contact is available.', href: `/v2/staff/${staff.id}/contacts` } : null,
      documents.length === 0 ? { label: 'Upload required documents', detail: 'The document record is currently empty.', href: `/v2/staff/${staff.id}/documents` } : null,
      problemDocuments > 0 ? { label: 'Resolve document issues', detail: `${problemDocuments} document${problemDocuments === 1 ? '' : 's'} need review.`, href: `/v2/staff/${staff.id}/documents` } : null,
    ].filter(Boolean) as NextAction[]
  }, [address, currentId, documents.length, emergencyContact, employment, problemDocuments, staff])

  if (loading) return <div className="dx-surface h-72 animate-pulse bg-[var(--dx-surface-muted)]" />
  if (error || !staff) return <div className="dx-surface p-6"><p className="text-sm font-semibold text-red-700">{error || 'Staff member not found.'}</p></div>

  const primaryAction = nextActions[0]

  return (
    <div className="space-y-5">
      <section className={`rounded-xl border p-4 sm:p-5 ${nextActions.length ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${nextActions.length ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {nextActions.length ? <TriangleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div>
              <p className={`text-sm font-bold ${nextActions.length ? 'text-amber-950' : 'text-emerald-950'}`}>{nextActions.length ? `${nextActions.length} item${nextActions.length === 1 ? '' : 's'} need attention` : 'This staff record is ready'}</p>
              <p className={`mt-1 text-sm ${nextActions.length ? 'text-amber-800' : 'text-emerald-800'}`}>{nextActions.length ? 'Complete these items to keep the record operationally ready.' : 'No immediate profile, document, or identity action is required.'}</p>
            </div>
          </div>
          {primaryAction ? <Link href={primaryAction.href} className="dx-button min-h-9 shrink-0 border border-amber-300 bg-white px-3 py-2 text-amber-950 hover:bg-amber-100">Resolve first item <ArrowRight className="h-4 w-4" /></Link> : null}
        </div>
        {nextActions.length ? (
          <div className="mt-4 grid gap-2 border-t border-amber-200 pt-4 md:grid-cols-2 xl:grid-cols-3">
            {nextActions.slice(0, 3).map((action) => (
              <Link key={action.label} href={action.href} className="group flex items-start justify-between gap-3 rounded-lg bg-white/80 px-3.5 py-3 ring-1 ring-amber-200 transition hover:bg-white">
                <span><span className="block text-sm font-semibold text-[var(--dx-ink)]">{action.label}</span><span className="mt-1 block text-xs leading-5 text-[var(--dx-muted)]">{action.detail}</span></span>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="dx-surface p-5">
        <div className="mb-4"><h2 className="text-base font-bold text-[var(--dx-ink)]">Readiness</h2><p className="mt-1 text-sm text-[var(--dx-muted)]">A clear view of the four areas required for day-to-day operations.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReadinessItem label="Profile completion" value={completion} detail={`${completion}% complete`} />
          <ReadinessItem label="Employment" value={employment ? 100 : 0} detail={employment ? 'Current record added' : 'Details missing'} />
          <ReadinessItem label="Documents" value={documentReadiness} detail={documents.length ? `${validDocuments} of ${documents.length} valid` : 'No documents'} />
          <ReadinessItem label="Digital ID" value={idReadiness} detail={currentId ? titleCase(currentId.status) : 'Not issued'} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.72fr)]">
        <div className="space-y-5">
          <OverviewSection title="Personal & contact" description="The details most often needed when identifying or contacting this person." icon={<UserRound className="h-4 w-4" />} actionHref={`/v2/staff/${staff.id}/edit`} actionLabel="Edit profile">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <SnapshotItem icon={<Mail className="h-4 w-4" />} label="Email" value={staff.email || 'Not provided'} />
              <SnapshotItem icon={<Phone className="h-4 w-4" />} label="Phone" value={staff.phone || 'Not provided'} />
              <SnapshotItem label="Date of birth" value={formatUKDate(staff.date_of_birth)} />
              <SnapshotItem label="Nationality" value={staff.nationality || 'Not provided'} />
              <SnapshotItem icon={<MapPin className="h-4 w-4" />} label="Address" value={address ? [address.street_address, address.city, address.post_code].filter(Boolean).join(', ') || 'Not provided' : 'Not provided'} />
              <SnapshotItem label="Emergency contact" value={emergencyContact ? `${emergencyContact.name}${emergencyContact.relationship ? ` · ${emergencyContact.relationship}` : ''}` : 'Not provided'} />
            </div>
          </OverviewSection>

          <OverviewSection title="Employment" description="Current contract and payroll assignment." icon={<BriefcaseBusiness className="h-4 w-4" />} actionHref={`/v2/staff/${staff.id}/employment`} actionLabel={employment ? 'Manage' : 'Add details'}>
            {employment ? (
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <SnapshotItem label="Employment type" value={titleCase(employment.employment_type)} />
                <SnapshotItem label="Contract number" value={employment.contract_number || 'Not provided'} />
                <SnapshotItem label="Contract dates" value={`${formatUKDate(employment.contract_start)} – ${formatUKDate(employment.contract_end)}`} />
                <SnapshotItem label="Pay schedule" value={titleCase(employment.pay_schedule)} />
                <SnapshotItem label="Payroll reference" value={employment.payroll_reference || 'Not provided'} />
              </div>
            ) : <EmptyPrompt text="No employment record has been added." href={`/v2/staff/${staff.id}/employment`} label="Add employment details" />}
          </OverviewSection>

          <OverviewSection title="Documents" description={problemDocuments ? `${problemDocuments} document${problemDocuments === 1 ? '' : 's'} need review.` : 'Recent compliance documents for this person.'} icon={<FileText className="h-4 w-4" />} actionHref={`/v2/staff/${staff.id}/documents`} actionLabel="View all">
            {latestDocuments.length ? (
              <div className="divide-y divide-[var(--dx-line)] rounded-lg border border-[var(--dx-line)]">
                {latestDocuments.map((document) => (
                  <Link key={document.id} href={`/v2/staff/${staff.id}/documents`} className="group flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[var(--dx-surface-muted)]">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--dx-ink)]">{document.document_types?.name || 'Document'}</p><p className="mt-1 text-xs text-[var(--dx-muted)]">Expires {formatUKDate(document.expiry_date)} · {document.document_number || 'No number'}</p></div>
                    <div className="flex shrink-0 items-center gap-2"><DocumentStatusBadge status={document.status} /><ChevronRight className="h-4 w-4 text-[var(--dx-muted)] transition group-hover:translate-x-0.5" /></div>
                  </Link>
                ))}
              </div>
            ) : <EmptyPrompt text="No documents have been uploaded." href={`/v2/staff/${staff.id}/documents`} label="Upload documents" />}
          </OverviewSection>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-[218px] xl:self-start">
          <OverviewSection title="Digital ID" description={currentId ? `${currentId.id_number} · ${titleCase(currentId.status)}` : 'No identity credential has been issued.'} icon={<ShieldCheck className="h-4 w-4" />} actionHref={`/v2/staff/${staff.id}/digital-id`} actionLabel="Open">
            {currentId ? (
              <div className="overflow-hidden rounded-lg border border-[var(--dx-line)] bg-[var(--dx-surface-muted)] p-3">
                <IdCard fullName={staff.full_name} employeeCode={staff.employee_code} roleTitle={currentId.role_title} idNumber={currentId.id_number} siaNumber={currentId.sia_number} qrToken={currentId.qr_token} photoUrl={staff.photo_url} issueDate={formatUKDate(currentId.issue_date)} expiryDate={formatUKDate(currentId.expiry_date)} idStatus={currentId.status} template={template} organizationName={organization.name} organizationLogoUrl={organization.logo_url} />
              </div>
            ) : <EmptyPrompt text="Identity coverage is missing." href={`/v2/staff/${staff.id}/issue-id`} label="Issue Digital ID" />}
          </OverviewSection>

          {primaryAction ? <section className="rounded-xl bg-[var(--dx-ink)] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Recommended next step</p><h2 className="mt-3 text-lg font-bold">{primaryAction.label}</h2><p className="mt-2 text-sm leading-6 text-white/65">{primaryAction.detail}</p><Link href={primaryAction.href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-white/80">Continue <ArrowRight className="h-4 w-4" /></Link></section> : null}

        </aside>
      </section>
    </div>
  )
}

function OverviewSection({ title, description, icon, actionHref, actionLabel, children }: { title: string; description?: string; icon?: React.ReactNode; actionHref?: string; actionLabel?: string; children: React.ReactNode }) {
  return <section className="dx-surface p-5"><div className="mb-5 flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3">{icon ? <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--dx-surface-muted)] text-[var(--dx-muted-strong)]">{icon}</span> : null}<div><h2 className="text-base font-bold text-[var(--dx-ink)]">{title}</h2>{description ? <p className="mt-1 text-sm leading-5 text-[var(--dx-muted)]">{description}</p> : null}</div></div>{actionHref && actionLabel ? <Link href={actionHref} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--dx-muted-strong)] hover:text-[var(--dx-signal)]">{actionLabel} <ChevronRight className="h-3.5 w-3.5" /></Link> : null}</div>{children}</section>
}

function ReadinessItem({ label, value, detail }: { label: string; value: number; detail: string }) {
  const tone = value >= 90 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return <div className="rounded-lg border border-[var(--dx-line)] p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[var(--dx-muted-strong)]">{label}</p><p className="text-xs font-bold text-[var(--dx-ink)]">{value}%</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--dx-surface-muted)]"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} /></div><p className="mt-2 text-xs text-[var(--dx-muted)]">{detail}</p></div>
}

function SnapshotItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--dx-muted)]">{icon}{label}</p><p className="mt-1.5 break-words text-sm font-semibold leading-5 text-[var(--dx-ink)]">{value}</p></div>
}

function EmptyPrompt({ text, href, label }: { text: string; href: string; label: string }) {
  return <div className="rounded-lg border border-dashed border-[var(--dx-line-strong)] bg-[var(--dx-surface-muted)] p-4"><p className="text-sm text-[var(--dx-muted)]">{text}</p><Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--dx-signal)]">{label} <ArrowRight className="h-4 w-4" /></Link></div>
}

function DocumentStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()
  const styles = normalized === 'valid' ? 'bg-emerald-50 text-emerald-700' : normalized === 'expired' || normalized === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}>{titleCase(status)}</span>
}
