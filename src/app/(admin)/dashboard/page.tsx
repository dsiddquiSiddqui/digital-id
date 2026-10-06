'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Users,
  Shield,
  IdCard,
  Bell,
  CalendarClock,
  FileText,
  ListTodo,
  Plus,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  MetricCard,
  PageHeader,
  PrimaryAction,
  SecondaryAction,
  SectionHeading,
  StatusPill,
  Surface,
} from '@/components/admin/AdminUi'

type Profile = {
  id: string
  auth_user_id: string
  organization_id?: string | null
  role: string
  full_name: string
  email: string
  is_active?: boolean
  organizations?: {
    name: string
    primary_color: string
    accent_color: string
  } | Array<{
    name: string
    primary_color: string
    accent_color: string
  }> | null
}

type Stats = {
  users: number
  staff: number
  ids: number
  alerts: number
}

type OperationalData = {
  expiring_documents: Array<{ id: string; expiry_date: string }>
  pending_renewals: number
  unread_notifications: number
  open_tasks: number
}

export default function DashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({
    users: 0,
    staff: 0,
    ids: 0,
    alerts: 0,
  })
  const [operations, setOperations] = useState<OperationalData>({
    expiring_documents: [],
    pending_renewals: 0,
    unread_notifications: 0,
    open_tasks: 0,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select(
            'id, auth_user_id, organization_id, role, full_name, email, is_active, organizations:organizations(name, primary_color, accent_color)'
          )
          .eq('auth_user_id', user.id)
          .single()

        const scopedProfile = (profileData ?? null) as Profile | null
        setProfile(scopedProfile)

        const role = scopedProfile?.role ?? ''
        const organizationId = scopedProfile?.organization_id ?? null
        const canViewUsers = !['operation_manager', 'operation_team'].includes(role)
        const canViewAlerts = ['super_admin', 'admin'].includes(role)

        const usersQuery = canViewUsers
          ? organizationId
            ? supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
            : supabase.from('profiles').select('*', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 })

        const staffQuery = organizationId
          ? supabase
              .from('staff')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
          : supabase
          .from('staff')
          .select('*', { count: 'exact', head: true })

        const idsQuery = organizationId
          ? supabase
              .from('staff_ids')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
          : supabase
          .from('staff_ids')
          .select('*', { count: 'exact', head: true })

        const alertsQuery = canViewAlerts
          ? organizationId
            ? supabase
                .from('security_events')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
            : supabase
                .from('security_events')
                .select('*', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 })

        const [u, s, i, a, operationsResponse] = await Promise.all([
          usersQuery,
          staffQuery,
          idsQuery,
          alertsQuery,
          fetch('/api/admin/dashboard/operations'),
        ])

        setStats({
          users: u?.count || 0,
          staff: s?.count || 0,
          ids: i?.count || 0,
          alerts: a?.count || 0,
        })
        if (operationsResponse.ok) setOperations(await operationsResponse.json())
      } catch (error) {
        console.error('Dashboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

  const role = profile?.role ?? ''
  const organization = Array.isArray(profile?.organizations)
    ? profile?.organizations[0] ?? null
    : profile?.organizations ?? null

  const permissions = useMemo(() => {
    const isSuperAdmin = role === 'super_admin'
    const isAdmin = role === 'admin'

    return {
      canViewUsers: !['operation_manager', 'operation_team'].includes(role),
      canViewAlerts: isSuperAdmin || isAdmin,
      canViewAuditLogs: isSuperAdmin || isAdmin,
      canCreateStaff: ['super_admin', 'admin', 'hr_manager', 'hr'].includes(role),
      canViewStaff: [
        'super_admin',
        'admin',
        'hr_manager',
        'hr',
        'operation_manager',
        'operation_team',
      ].includes(role),
      canViewBulkUpload: ['super_admin', 'admin', 'hr_manager', 'hr'].includes(role),
    }
  }, [role])

  const statCards = useMemo(() => {
    const items = []

    if (permissions.canViewUsers) {
      items.push({
        title: 'Users',
        value: stats.users,
        icon: Users,
        highlight: false,
      })
    }

    if (permissions.canViewStaff) {
      items.push({
        title: 'Staff',
        value: stats.staff,
        icon: Shield,
        highlight: true,
      })
    }

    items.push({
      title: 'Digital IDs',
      value: stats.ids,
      icon: IdCard,
      highlight: false,
    })

    if (permissions.canViewAlerts) {
      items.push({
        title: 'Alerts',
        value: stats.alerts,
        icon: Bell,
        highlight: false,
      })
    }

    return items
  }, [permissions, stats])

  const overviewItems = useMemo(() => {
    const items = []

    if (permissions.canViewStaff) {
      items.push({ label: 'Total Staff', value: stats.staff })
    }

    items.push({ label: 'Digital IDs', value: stats.ids })

    if (permissions.canViewUsers) {
      items.push({ label: 'System Users', value: stats.users })
    }

    if (permissions.canViewAlerts) {
      items.push({ label: 'Alerts', value: stats.alerts })
    }

    return items
  }, [permissions, stats])

  const managementPanels = useMemo(() => {
    const items = []

    if (permissions.canViewStaff) {
      items.push({
        title: 'Staff',
        desc: 'Manage all staff records and details',
        href: '/v2/staff',
      })
    }

    if (permissions.canViewUsers) {
      items.push({
        title: 'Users',
        desc: 'Manage internal users and permissions',
        href: '/users',
      })
    }

    if (permissions.canViewBulkUpload) {
      items.push({
        title: 'Bulk Upload',
        desc: 'Upload staff records in bulk',
        href: '/v2/staff/bulk-upload',
      })
    }

    if (permissions.canViewAlerts) {
      items.push({
        title: 'Alerts',
        desc: 'Review system alerts and flagged activity',
        href: '/alerts',
      })
    }

    return items
  }, [permissions])

  const quickActions = useMemo(() => {
    const items = []

    if (permissions.canCreateStaff) {
      items.push({
        href: '/v2/staff/new',
        label: 'Create Staff',
        icon: <Plus className="h-4 w-4" />,
      })
    }

    if (permissions.canViewAlerts) {
      items.push({
        href: '/alerts',
        label: 'View Alerts',
        icon: <Bell className="h-4 w-4" />,
      })
    }

    if (permissions.canViewAuditLogs) {
      items.push({
        href: '/audit-logs',
        label: 'Audit Logs',
        icon: <FileText className="h-4 w-4" />,
      })
    }

    return items
  }, [permissions])

  const welcomeText = useMemo(() => {
    if (role === 'super_admin') {
      return 'Full access to users, staff, alerts, and audit activity.'
    }
    if (role === 'admin') {
      return 'Monitor staff operations, alerts, and internal system activity.'
    }
    if (role === 'hr_manager') {
      return 'Manage staff records, uploads, and user-related HR operations.'
    }
    if (role === 'hr') {
      return 'Handle staff records, onboarding, and bulk upload workflows.'
    }
    if (role === 'operation_manager') {
      return 'Monitor operational staff records and digital identity status.'
    }
    if (role === 'operation_team') {
      return 'View staff operations and digital identity information.'
    }
    return 'Manage your staff operations in one place.'
  }, [role])

  if (loading) {
    return (
      <div className="dx-page space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-28 animate-pulse rounded-[18px] bg-white/60" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[18px] border border-[var(--dx-line)] bg-white/75" />
          ))}
        </div>
      </div>
    )
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there'
  const identityCoverage = stats.staff > 0 ? Math.min(100, Math.round((stats.ids / stats.staff) * 100)) : 0
  const workItems = [
    { label: 'Expiring in 30 days', value: operations.expiring_documents.length, href: '/expiry-alerts', icon: CalendarClock },
    { label: 'Renewals to review', value: operations.pending_renewals, href: '/document-renewals', icon: FileText },
    { label: 'Unread updates', value: operations.unread_notifications, href: '/notifications', icon: Bell },
    { label: 'Open admin tasks', value: operations.open_tasks, href: '/onboarding-checklist', icon: ListTodo },
  ].filter((item) => item.value > 0)

  return (
    <div className="dx-page space-y-5 pb-8">
      <PageHeader
        eyebrow={organization?.name || 'Workspace overview'}
        title={`Welcome back, ${firstName}`}
        description={welcomeText}
        actions={
          <>
            <SecondaryAction href="/reports">View reports</SecondaryAction>
            {permissions.canCreateStaff ? <PrimaryAction href="/v2/staff/new">Add staff member</PrimaryAction> : null}
          </>
        }
      />

      <div
        className={`grid gap-3 ${
          statCards.length === 1
            ? 'grid-cols-1'
            : statCards.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : statCards.length === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        }`}
      >
        {statCards.map((card) => (
          <MetricCard
            key={card.title}
            label={card.title}
            value={card.value}
            icon={card.icon}
            href={card.title === 'Users' ? '/users' : card.title === 'Alerts' ? '/alerts' : '/v2/staff'}
            detail={card.title === 'Digital IDs' ? `${identityCoverage}% of staff covered` : 'Open workspace records'}
            signal={card.highlight}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">
        <div className="space-y-5">
          <Surface className="p-5 sm:p-6">
            <SectionHeading
              title="Identity coverage"
              description="How much of your active staff directory has a digital identity issued."
              action={<StatusPill tone={identityCoverage >= 90 ? 'success' : identityCoverage >= 60 ? 'warning' : 'neutral'}>{identityCoverage}% covered</StatusPill>}
            />

            <div className="mt-7 grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
              <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--dx-signal) ${identityCoverage}%, var(--dx-canvas) 0)` }}>
                <div className="flex h-[126px] w-[126px] flex-col items-center justify-center rounded-full bg-white">
                  <strong className="text-4xl font-black tracking-[-0.06em] text-[var(--dx-ink)]">{identityCoverage}%</strong>
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--dx-muted)]">Issued</span>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--dx-line)] bg-[var(--dx-line)] sm:grid-cols-4">
                  {overviewItems.map((item) => (
                    <div key={item.label} className="bg-[var(--dx-surface-muted)] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--dx-muted)]">{item.label}</p>
                      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--dx-ink)]">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--dx-muted)]">
                  {stats.staff === 0
                    ? 'Add your first staff member to begin issuing secure digital identities.'
                    : stats.ids < stats.staff
                      ? `${stats.staff - stats.ids} staff record${stats.staff - stats.ids === 1 ? '' : 's'} still need a digital ID.`
                      : 'Every staff record currently has a digital ID.'}
                </p>
              </div>
            </div>
          </Surface>

          {managementPanels.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {managementPanels.map((panel) => (
                <Link key={panel.href} href={panel.href} className="group flex min-h-32 items-end justify-between gap-5 rounded-[18px] border border-[var(--dx-line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--dx-line-strong)] hover:shadow-[0_14px_30px_rgba(23,25,21,0.07)]">
                  <div>
                    <p className="text-lg font-black tracking-[-0.025em] text-[var(--dx-ink)]">{panel.title}</p>
                    <p className="mt-1 max-w-xs text-sm leading-6 text-[var(--dx-muted)]">{panel.desc}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dx-canvas)] text-[var(--dx-ink)] transition group-hover:bg-[var(--dx-signal)]">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <Surface className="p-5 sm:p-6">
            <SectionHeading title="Needs attention" description="The next few workspace tasks worth resolving." />
            {workItems.length ? (
              <div className="mt-4 divide-y divide-[var(--dx-line)] rounded-2xl border border-[var(--dx-line)]">
                {workItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link key={item.label} href={item.href} className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-[var(--dx-surface-muted)]">
                      <span className="flex items-center gap-3 text-sm font-bold text-[var(--dx-ink)]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dx-signal-soft)] text-[var(--dx-success)]"><Icon className="h-4 w-4" /></span>{item.label}</span>
                      <span className="flex items-center gap-2 text-sm font-black text-[var(--dx-ink)]">{item.value}<ArrowRight className="h-4 w-4" /></span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-[var(--dx-surface-muted)] px-4 py-5 text-sm leading-6 text-[var(--dx-muted)]">Everything is clear right now. New security, document, and workspace updates will appear here.</p>
            )}
          </Surface>
        </div>

        <div className="space-y-5">
          {quickActions.length > 0 ? (
            <Surface className="p-5">
              <SectionHeading title="Quick actions" description="Continue common workspace tasks." />
              <div className="mt-4 space-y-2">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href} className="group flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-sm font-bold text-[var(--dx-muted-strong)] transition hover:bg-[var(--dx-surface-muted)] hover:text-[var(--dx-ink)]">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dx-canvas)] text-[var(--dx-muted)] group-hover:bg-[var(--dx-signal)] group-hover:text-[var(--dx-ink)]">{action.icon}</span>
                      {action.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[var(--dx-line-strong)] transition group-hover:translate-x-0.5 group-hover:text-[var(--dx-ink)]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </Surface>
          ) : null}

          <section className="relative overflow-hidden rounded-[18px] bg-[var(--dx-ink)] p-5 text-white">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-[var(--dx-signal)]/15" />
            <div className="relative">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dx-signal)] text-[var(--dx-ink)]">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Workspace signal</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Identity operations, in one place.</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">Review records, issue IDs, and resolve alerts without losing context.</p>
              <Link href="/v2/staff" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--dx-signal)]">
                Open staff directory <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
