'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, BadgeAlert, CheckCircle2, ChevronLeft, ChevronRight, FileUp, IdCard, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, PrimaryAction, SecondaryAction, StatusPill, Surface } from '@/components/admin/AdminUi'

type StaffRow = { id: string; full_name: string; employee_code: string; company_name: string | null; email: string | null; phone: string | null; status: string; staff_type: string; photo_url: string | null; created_at: string }
type StaffIdRow = { id: string; staff_id: string; id_number: string; status: string; expiry_date: string; is_current: boolean }
type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended' | 'revoked' | 'archived'
type FilterType = 'all' | 'security' | 'warehouse' | 'event' | 'admin' | 'contractor' | 'other'
type IdFilter = 'all' | 'active' | 'missing' | 'expiring'
type SortKey = 'newest' | 'name' | 'employee-code'
type SavedView = 'all' | 'active' | 'missing-id' | 'expiring-id'

const PAGE_SIZE = 25
const STATUS_OPTIONS = [['all', 'All statuses'], ['active', 'Active'], ['inactive', 'Inactive'], ['suspended', 'Suspended'], ['revoked', 'Revoked'], ['archived', 'Archived']]
const TYPE_OPTIONS = [['all', 'All staff types'], ['security', 'Security'], ['warehouse', 'Warehouse'], ['event', 'Event'], ['admin', 'Admin'], ['contractor', 'Contractor'], ['other', 'Other']]
const ID_OPTIONS = [['all', 'Any ID status'], ['active', 'Active ID'], ['missing', 'Missing ID'], ['expiring', 'Expiring in 30 days']]
const SORT_OPTIONS = [['newest', 'Recently added'], ['name', 'Name A–Z'], ['employee-code', 'Employee code']]

function formatUKDate(dateString?: string | null) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateString?: string | null) {
  if (!dateString) return Number.POSITIVE_INFINITY
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000)
}

export default function V2StaffPage() {
  return (
    <Suspense fallback={<DirectoryPageSkeleton />}>
      <StaffDirectory />
    </Suspense>
  )
}

function StaffDirectory() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [currentIds, setCurrentIds] = useState<Record<string, StaffIdRow | null>>({})
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(() => (searchParams.get('status') as FilterStatus) || 'all')
  const [typeFilter, setTypeFilter] = useState<FilterType>(() => (searchParams.get('type') as FilterType) || 'all')
  const [idFilter, setIdFilter] = useState<IdFilter>(() => (searchParams.get('id') as IdFilter) || 'all')
  const [sort, setSort] = useState<SortKey>(() => (searchParams.get('sort') as SortKey) || 'newest')
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (idFilter !== 'all') params.set('id', idFilter)
    if (sort !== 'newest') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))
    const query = params.toString()
    window.history.replaceState(null, '', query ? `/v2/staff?${query}` : '/v2/staff')
  }, [idFilter, page, search, sort, statusFilter, typeFilter])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Your session could not be verified. Please sign in again.')
        setLoading(false)
        return
      }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('organization_id').eq('auth_user_id', user.id).single()
      if (profileError || !profile?.organization_id) {
        setError('Your workspace could not be loaded.')
        setLoading(false)
        return
      }
      const [staffRes, idsRes] = await Promise.all([
        supabase.from('staff').select('id, full_name, employee_code, company_name, email, phone, status, staff_type, photo_url, created_at').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }),
        supabase.from('staff_ids').select('id, staff_id, id_number, status, expiry_date, is_current').eq('organization_id', profile.organization_id).eq('is_current', true),
      ])
      if (staffRes.error || idsRes.error) {
        setError(staffRes.error?.message || idsRes.error?.message || 'The staff directory could not be loaded.')
        setLoading(false)
        return
      }
      const idsMap: Record<string, StaffIdRow | null> = {}
      for (const row of (idsRes.data || []) as StaffIdRow[]) idsMap[row.staff_id] = row
      setStaff((staffRes.data || []) as StaffRow[])
      setCurrentIds(idsMap)
      setLoading(false)
    }
    void loadData()
  }, [supabase])

  const stats = useMemo(() => {
    const ids = Object.values(currentIds)
    return {
      total: staff.length,
      active: staff.filter((member) => member.status === 'active').length,
      covered: ids.filter((record) => record?.status === 'active').length,
      needsId: staff.filter((member) => !currentIds[member.id]).length,
      expiring: ids.filter((record) => { const days = daysUntil(record?.expiry_date); return days >= 0 && days <= 30 }).length,
    }
  }, [currentIds, staff])

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = staff.filter((member) => {
      const currentId = currentIds[member.id]
      const expiryDays = daysUntil(currentId?.expiry_date)
      const matchesSearch = !query || member.full_name.toLowerCase().includes(query) || member.employee_code.toLowerCase().includes(query) || member.company_name?.toLowerCase().includes(query) || member.email?.toLowerCase().includes(query) || member.phone?.toLowerCase().includes(query) || currentId?.id_number.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter
      const matchesType = typeFilter === 'all' || member.staff_type === typeFilter
      const matchesId = idFilter === 'all' || (idFilter === 'active' && currentId?.status === 'active') || (idFilter === 'missing' && !currentId) || (idFilter === 'expiring' && expiryDays >= 0 && expiryDays <= 30)
      return matchesSearch && matchesStatus && matchesType && matchesId
    })
    return result.toSorted((a, b) => {
      if (sort === 'name') return a.full_name.localeCompare(b.full_name)
      if (sort === 'employee-code') return a.employee_code.localeCompare(b.employee_code)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [currentIds, idFilter, search, sort, staff, statusFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleStaff = filteredStaff.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasFilters = Boolean(search.trim()) || statusFilter !== 'all' || typeFilter !== 'all' || idFilter !== 'all'

  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setIdFilter('all'); setPage(1) }
  const selectView = (view: SavedView) => {
    clearFilters()
    if (view === 'active') setStatusFilter('active')
    if (view === 'missing-id') setIdFilter('missing')
    if (view === 'expiring-id') setIdFilter('expiring')
  }

  return (
    <div className="dx-page space-y-5">
      <PageHeader eyebrow="People operations" title="Staff directory" description="Find any person, understand their readiness, and continue the right workflow without losing your place." actions={<><SecondaryAction href="/v2/staff/bulk-upload"><FileUp className="h-4 w-4" />Import staff</SecondaryAction><PrimaryAction href="/v2/staff/new">Add staff</PrimaryAction></>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DirectoryMetric label="All staff" value={stats.total} icon={Users} />
        <DirectoryMetric label="Active" value={stats.active} icon={CheckCircle2} />
        <DirectoryMetric label="IDs issued" value={stats.covered} icon={ShieldCheck} />
        <DirectoryMetric label="Needs attention" value={stats.needsId + stats.expiring} icon={BadgeAlert} signal />
      </div>

      <Surface className="overflow-hidden">
        <div className="border-b border-[var(--dx-line)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 xl:pb-0" aria-label="Saved staff views">
              <ViewButton label="All staff" count={stats.total} active={!hasFilters} onClick={() => selectView('all')} />
              <ViewButton label="Active" count={stats.active} active={statusFilter === 'active' && idFilter === 'all'} onClick={() => selectView('active')} />
              <ViewButton label="Missing ID" count={stats.needsId} active={idFilter === 'missing'} onClick={() => selectView('missing-id')} />
              <ViewButton label="Expiring soon" count={stats.expiring} active={idFilter === 'expiring'} onClick={() => selectView('expiring-id')} />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--dx-line)] bg-white px-3 xl:w-80">
                <Search className="h-4 w-4 shrink-0 text-[var(--dx-muted)]" aria-hidden="true" /><span className="sr-only">Search staff</span>
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Name, employee code, email or ID…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--dx-ink)] outline-none placeholder:font-normal placeholder:text-[var(--dx-muted)]" />
                {search ? <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="rounded-md p-1 text-[var(--dx-muted)] hover:bg-[var(--dx-surface-muted)]"><X className="h-3.5 w-3.5" /></button> : null}
              </label>
              <button type="button" onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen} className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${filtersOpen || hasFilters ? 'border-[#b7dfc6] bg-[var(--dx-signal-soft)] text-[var(--dx-signal)]' : 'border-[var(--dx-line)] bg-white text-[var(--dx-muted-strong)] hover:bg-[var(--dx-surface-muted)]'}`}><SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Filters</span></button>
            </div>
          </div>
          {filtersOpen ? <div className="mt-4 grid gap-3 rounded-lg border border-[var(--dx-line)] bg-[var(--dx-surface-muted)] p-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Staff status" value={statusFilter} onChange={(value) => { setStatusFilter(value as FilterStatus); setPage(1) }} options={STATUS_OPTIONS} />
            <FilterSelect label="Staff type" value={typeFilter} onChange={(value) => { setTypeFilter(value as FilterType); setPage(1) }} options={TYPE_OPTIONS} />
            <FilterSelect label="Digital ID" value={idFilter} onChange={(value) => { setIdFilter(value as IdFilter); setPage(1) }} options={ID_OPTIONS} />
            <FilterSelect label="Sort by" value={sort} onChange={(value) => { setSort(value as SortKey); setPage(1) }} options={SORT_OPTIONS} />
          </div> : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-[var(--dx-line)] px-4 py-3 sm:px-5"><p className="text-xs font-bold text-[var(--dx-muted)]">{loading ? 'Loading directory…' : `${filteredStaff.length} ${filteredStaff.length === 1 ? 'person' : 'people'}`}</p>{hasFilters ? <button type="button" onClick={clearFilters} className="text-xs font-black text-[var(--dx-ink)] underline decoration-[var(--dx-line-strong)] underline-offset-4">Clear all filters</button> : null}</div>
        {error ? <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[980px]"><thead><tr className="border-b border-[var(--dx-line)] bg-[var(--dx-surface-muted)]">{['Staff member', 'Assignment', 'Status', 'Digital ID', 'Contact', ''].map((heading) => <th key={heading || 'actions'} className="px-5 py-3 text-left text-xs font-semibold text-[var(--dx-muted-strong)]">{heading}</th>)}</tr></thead>
            <tbody>{loading ? <DirectorySkeleton /> : null}{!loading && visibleStaff.length === 0 ? <tr><td colSpan={6}><EmptyDirectory hasFilters={hasFilters} onClear={clearFilters} /></td></tr> : null}{!loading ? visibleStaff.map((member) => <StaffTableRow key={member.id} member={member} currentId={currentIds[member.id]} />) : null}</tbody>
          </table>
        </div>
        <div className="divide-y divide-[var(--dx-line)] lg:hidden">{loading ? <div className="p-5 text-sm font-semibold text-[var(--dx-muted)]">Loading staff…</div> : null}{!loading && visibleStaff.length === 0 ? <EmptyDirectory hasFilters={hasFilters} onClear={clearFilters} /> : null}{!loading ? visibleStaff.map((member) => <StaffMobileCard key={member.id} member={member} currentId={currentIds[member.id]} />) : null}</div>
        {!loading && filteredStaff.length > PAGE_SIZE ? <div className="flex items-center justify-between border-t border-[var(--dx-line)] px-4 py-3 sm:px-5"><p className="text-xs font-bold text-[var(--dx-muted)]">Page {safePage} of {totalPages}</p><div className="flex gap-2"><PageButton label="Previous page" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></PageButton><PageButton label="Next page" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-4 w-4" /></PageButton></div></div> : null}
      </Surface>
    </div>
  )
}

function DirectoryMetric({ label, value, icon: Icon, signal = false }: { label: string; value: number; icon: typeof Users; signal?: boolean }) {
  return <div className={`rounded-xl border bg-white p-4 text-[var(--dx-ink)] ${signal ? 'border-amber-200' : 'border-[var(--dx-line)]'}`}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--dx-muted)]">{label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${signal ? 'bg-amber-50 text-amber-700' : 'bg-[var(--dx-surface-muted)] text-[var(--dx-muted-strong)]'}`}><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-bold tracking-[-0.035em]">{value}</p></div>
}

function ViewButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-[var(--dx-signal-soft)] text-[var(--dx-signal)] ring-1 ring-inset ring-[#cdebd8]' : 'text-[var(--dx-muted-strong)] hover:bg-[var(--dx-surface-muted)]'}`}>{label}<span className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? 'bg-white text-[var(--dx-signal)]' : 'bg-[var(--dx-canvas)] text-[var(--dx-muted)]'}`}>{count}</span></button>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--dx-muted)]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 w-full rounded-lg border border-[var(--dx-line)] bg-white px-3 text-sm font-semibold text-[var(--dx-ink)]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>
}

function StaffTableRow({ member, currentId }: { member: StaffRow; currentId: StaffIdRow | null | undefined }) {
  return <tr className="group border-b border-[var(--dx-line)] last:border-0 hover:bg-[var(--dx-surface-muted)]"><td className="px-5 py-4"><StaffIdentity member={member} /></td><td className="px-5 py-4"><p className="text-sm font-bold capitalize text-[var(--dx-ink)]">{member.staff_type || 'Other'}</p><p className="mt-1 text-xs text-[var(--dx-muted)]">{member.company_name || 'No company'}</p></td><td className="px-5 py-4"><StaffStatus status={member.status} /></td><td className="px-5 py-4"><DigitalIdStatus record={currentId} /></td><td className="px-5 py-4"><p className="max-w-52 truncate text-sm font-semibold text-[var(--dx-muted-strong)]">{member.email || 'No email'}</p><p className="mt-1 text-xs text-[var(--dx-muted)]">{member.phone || 'No phone'}</p></td><td className="px-5 py-4 text-right"><Link href={`/v2/staff/${member.id}`} aria-label={`Open ${member.full_name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--dx-muted)] transition group-hover:bg-white group-hover:text-[var(--dx-ink)]"><ArrowRight className="h-4 w-4" /></Link></td></tr>
}

function StaffMobileCard({ member, currentId }: { member: StaffRow; currentId: StaffIdRow | null | undefined }) {
  return <div className="p-4 transition hover:bg-[var(--dx-surface-muted)]"><div className="flex items-start justify-between gap-3"><StaffIdentity member={member} /><Link href={`/v2/staff/${member.id}`} aria-label={`Open ${member.full_name}`} className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--dx-muted)]"><ArrowRight className="h-4 w-4" /></Link></div><div className="mt-4 flex flex-wrap items-center gap-2"><StaffStatus status={member.status} /><DigitalIdStatus record={currentId} compact /></div><p className="mt-3 text-xs font-semibold text-[var(--dx-muted)]">{member.company_name || 'No company'} · <span className="capitalize">{member.staff_type}</span></p></div>
}

function StaffIdentity({ member }: { member: StaffRow }) {
  return <div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--dx-canvas)]">{member.photo_url ? <Image src={member.photo_url} alt="" width={44} height={44} className="h-full w-full object-cover" /> : <span className="text-sm font-black text-[var(--dx-muted-strong)]">{member.full_name.charAt(0).toUpperCase()}</span>}</div><div className="min-w-0"><Link href={`/v2/staff/${member.id}`} className="block truncate text-sm font-black text-[var(--dx-ink)] hover:underline">{member.full_name}</Link><p className="mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--dx-muted)]">{member.employee_code}</p></div></div>
}

function StaffStatus({ status }: { status: string }) {
  const tone = status === 'active' ? 'success' : status === 'suspended' ? 'warning' : ['revoked', 'expired'].includes(status) ? 'danger' : 'neutral'
  return <StatusPill tone={tone}><span className="capitalize">{status}</span></StatusPill>
}

function DigitalIdStatus({ record, compact = false }: { record: StaffIdRow | null | undefined; compact?: boolean }) {
  if (!record) return <StatusPill tone="warning">ID missing</StatusPill>
  const days = daysUntil(record.expiry_date)
  const expiring = days >= 0 && days <= 30
  return <div><StatusPill tone={record.status === 'active' && !expiring ? 'success' : expiring ? 'warning' : 'danger'}>{expiring ? `Expires in ${days}d` : `ID ${record.status}`}</StatusPill>{!compact ? <p className="mt-1.5 font-mono text-[10px] font-bold text-[var(--dx-muted)]">{record.id_number} · {formatUKDate(record.expiry_date)}</p> : null}</div>
}

function DirectorySkeleton() {
  return <>{Array.from({ length: 5 }, (_, index) => <tr key={index} className="border-b border-[var(--dx-line)]"><td colSpan={6} className="px-5 py-4"><div className="h-11 animate-pulse rounded-xl bg-[var(--dx-surface-muted)]" /></td></tr>)}</>
}

function DirectoryPageSkeleton() {
  return <div className="dx-page space-y-4"><div className="h-28 animate-pulse rounded-2xl bg-white" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-white" />)}</div><div className="h-96 animate-pulse rounded-2xl bg-white" /></div>
}

function EmptyDirectory({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return <div className="flex flex-col items-center px-6 py-14 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--dx-canvas)] text-[var(--dx-muted)]"><IdCard className="h-5 w-5" /></span><p className="mt-4 text-sm font-black text-[var(--dx-ink)]">{hasFilters ? 'No staff match these filters' : 'No staff have been added yet'}</p><p className="mt-1 max-w-sm text-xs leading-5 text-[var(--dx-muted)]">{hasFilters ? 'Clear a filter or try a broader search.' : 'Create your first staff record to begin issuing Digital IDs.'}</p>{hasFilters ? <button type="button" onClick={onClear} className="mt-4 text-xs font-black underline underline-offset-4">Clear filters</button> : <Link href="/v2/staff/new" className="dx-button dx-button-primary mt-4">Add staff</Link>}</div>
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dx-line)] bg-white text-[var(--dx-muted-strong)] transition hover:bg-[var(--dx-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40">{children}</button>
}
