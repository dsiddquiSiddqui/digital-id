'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
  ArrowLeft,
  ChevronDown,
  CirclePlay,
  IdCard,
  KeyRound,
  LoaderCircle,
  Pencil,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'

type StaffShellRecord = {
  id: string
  full_name: string
  employee_code: string
  company_name: string | null
  staff_type: string
  status: string
  photo_url: string | null
}

type DigitalIdSummary = {
  id: string
  status: string
  id_number: string
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'active' || normalized === 'valid') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (normalized === 'expired' || normalized === 'revoked') return 'bg-red-50 text-red-700 ring-red-200'
  if (normalized === 'suspended') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

export default function StaffRecordLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const staffId = params.id as string
  const [staff, setStaff] = useState<StaffShellRecord | null>(null)
  const [digitalId, setDigitalId] = useState<DigitalIdSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionsOpen, setActionsOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState('')

  useEffect(() => {
    const loadStaffShell = async () => {
      setLoading(true)
      setError('')

      try {
        const [staffResponse, digitalIdResponse] = await Promise.all([
          fetch(`/api/v2/staff/${staffId}`),
          fetch(`/api/v2/staff/${staffId}/digital-id`),
        ])
        const staffResult = await staffResponse.json()
        const digitalIdResult = await digitalIdResponse.json()

        if (!staffResponse.ok || !staffResult.staff) {
          setError(staffResult.error || 'Staff member could not be loaded.')
          setLoading(false)
          return
        }

        setStaff(staffResult.staff as StaffShellRecord)
        setDigitalId(
          digitalIdResponse.ok
            ? (digitalIdResult.digital_id as DigitalIdSummary | null)
            : null
        )
      } catch {
        setError('The staff workspace could not be loaded.')
      } finally {
        setLoading(false)
      }
    }

    if (staffId) void loadStaffShell()
  }, [staffId])

  const tabs = useMemo(
    () => [
      { label: 'Overview', href: `/v2/staff/${staffId}`, active: pathname === `/v2/staff/${staffId}` },
      { label: 'Personal', href: `/v2/staff/${staffId}/edit`, active: pathname.endsWith('/edit') },
      { label: 'Employment', href: `/v2/staff/${staffId}/employment`, active: pathname.endsWith('/employment') || pathname.endsWith('/bank-details') },
      { label: 'Contact', href: `/v2/staff/${staffId}/contacts`, active: pathname.endsWith('/contacts') || pathname.endsWith('/address') },
      { label: 'Documents', href: `/v2/staff/${staffId}/documents`, active: pathname.endsWith('/documents') || pathname.endsWith('/checklist') },
      { label: 'Digital ID', href: `/v2/staff/${staffId}/digital-id`, active: pathname.endsWith('/digital-id') },
      { label: 'Activity', href: `/v2/staff/${staffId}/activity`, active: pathname.endsWith('/activity') },
    ],
    [pathname, staffId]
  )

  const updateStatus = async (status: string) => {
    if (!staff) return
    setStatusUpdating(status)
    setActionError('')

    try {
      const response = await fetch('/api/admin/update-staff-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staff.id, status }),
      })
      const result = await response.json()

      if (!response.ok) {
        setActionError(result.error || 'Staff status could not be updated.')
        return
      }

      setStaff((current) => current ? { ...current, status } : current)
      setActionsOpen(false)
    } catch {
      setActionError('Staff status could not be updated.')
    } finally {
      setStatusUpdating('')
    }
  }

  if (loading) {
    return (
      <div className="dx-page space-y-4">
        <div className="h-36 animate-pulse rounded-xl border border-[var(--dx-line)] bg-white" />
        <div className="h-80 animate-pulse rounded-xl border border-[var(--dx-line)] bg-white" />
      </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="dx-page rounded-xl border border-red-200 bg-white p-6">
        <p className="text-sm font-semibold text-red-700">{error || 'Staff member not found.'}</p>
        <Link href="/v2/staff" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--dx-signal)]">
          <ArrowLeft className="h-4 w-4" /> Return to staff directory
        </Link>
      </div>
    )
  }

  return (
    <div className="dx-page space-y-5">
      <section className="z-20 overflow-hidden rounded-xl border border-[var(--dx-line)] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.06)] lg:sticky lg:top-[65px]">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <Link href="/v2/staff" aria-label="Back to staff directory" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dx-line)] text-[var(--dx-muted)] transition hover:bg-[var(--dx-surface-muted)] hover:text-[var(--dx-ink)] sm:flex">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--dx-line)] bg-[var(--dx-surface-muted)]">
              {staff.photo_url ? (
                <Image unoptimized src={staff.photo_url} alt={staff.full_name} width={48} height={48} className="h-full w-full object-cover" />
              ) : (
                <span className="text-base font-bold text-[var(--dx-muted-strong)]">{staff.full_name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-[-0.02em] text-[var(--dx-ink)] sm:text-xl">{staff.full_name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${statusTone(staff.status)}`}>{titleCase(staff.status)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${digitalId ? statusTone(digitalId.status) : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>{digitalId ? `ID ${titleCase(digitalId.status)}` : 'ID missing'}</span>
              </div>
              <p className="mt-1 truncate text-xs text-[var(--dx-muted)]">
                {staff.employee_code} · {titleCase(staff.staff_type)} · {staff.company_name || 'No company assigned'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/v2/staff/${staff.id}/edit`} className="dx-button dx-button-secondary min-h-10 px-3 py-2">
              <Pencil className="h-4 w-4" /> Edit profile
            </Link>
            <Link href={digitalId ? `/v2/staff-ids/${digitalId.id}/edit` : `/v2/staff/${staff.id}/issue-id`} className="dx-button dx-button-primary min-h-10 px-3 py-2">
              {digitalId ? <ShieldCheck className="h-4 w-4" /> : <IdCard className="h-4 w-4" />}
              {digitalId ? 'Manage ID' : 'Issue ID'}
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setActionsOpen((current) => !current)} aria-expanded={actionsOpen} aria-label="More staff actions" className="flex h-10 items-center gap-1 rounded-lg border border-[var(--dx-line)] bg-white px-2.5 text-[var(--dx-muted-strong)] hover:bg-[var(--dx-surface-muted)]">
                <ChevronDown className="h-4 w-4" />
              </button>
              {actionsOpen ? (
                <div className="absolute right-0 top-12 z-30 w-60 rounded-xl border border-[var(--dx-line)] bg-white p-1.5 shadow-xl">
                  <Link href={`/v2/staff/${staff.id}/password`} onClick={() => setActionsOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--dx-muted-strong)] hover:bg-[var(--dx-surface-muted)] hover:text-[var(--dx-ink)]">
                    <KeyRound className="h-4 w-4" /> Reset password
                  </Link>
                  <div className="my-1.5 border-t border-[var(--dx-line)]" />
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--dx-muted)]">Record status</p>
                  {staff.status.toLowerCase() !== 'active' ? (
                    <StatusMenuButton label="Activate staff" status="active" updating={statusUpdating} icon={<CirclePlay className="h-4 w-4" />} onSelect={updateStatus} />
                  ) : null}
                  {staff.status.toLowerCase() !== 'suspended' ? (
                    <StatusMenuButton label="Suspend staff" status="suspended" updating={statusUpdating} icon={<ShieldAlert className="h-4 w-4" />} onSelect={updateStatus} />
                  ) : null}
                  {staff.status.toLowerCase() !== 'revoked' ? (
                    <StatusMenuButton label="Revoke access" status="revoked" updating={statusUpdating} danger icon={<ShieldAlert className="h-4 w-4" />} onSelect={updateStatus} />
                  ) : null}
                  {actionError ? <p className="mx-2 mt-1 rounded-lg bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700">{actionError}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <nav className="overflow-x-auto border-t border-[var(--dx-line)] px-3 sm:px-4" aria-label="Staff record sections">
          <div className="flex min-w-max items-center gap-1">
            {tabs.map((tab) => (
              <Link key={tab.label} href={tab.href} aria-current={tab.active ? 'page' : undefined} className={`border-b-2 px-3 py-3 text-xs font-semibold transition ${tab.active ? 'border-[var(--dx-signal)] text-[var(--dx-signal)]' : 'border-transparent text-[var(--dx-muted)] hover:text-[var(--dx-ink)]'}`}>
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      </section>

      {children}
    </div>
  )
}

function StatusMenuButton({ label, status, updating, danger = false, icon, onSelect }: {
  label: string
  status: string
  updating: string
  danger?: boolean
  icon: React.ReactNode
  onSelect: (status: string) => Promise<void>
}) {
  const isUpdating = updating === status
  return (
    <button
      type="button"
      disabled={Boolean(updating)}
      onClick={() => void onSelect(status)}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold disabled:cursor-wait disabled:opacity-60 ${danger ? 'text-red-700 hover:bg-red-50' : 'text-[var(--dx-muted-strong)] hover:bg-[var(--dx-surface-muted)] hover:text-[var(--dx-ink)]'}`}
    >
      {isUpdating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {isUpdating ? 'Updating…' : label}
    </button>
  )
}
