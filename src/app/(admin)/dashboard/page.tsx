'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Shield,
  IdCard,
  Bell,
  FileText,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  auth_user_id: string
  role: string
  full_name: string
  email: string
  is_active?: boolean
}

type Stats = {
  users: number
  staff: number
  ids: number
  alerts: number
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
          .select('*')
          .eq('auth_user_id', user.id)
          .single()

        setProfile(profileData ?? null)

        const role = profileData?.role ?? ''
        const canViewUsers = !['operation_manager', 'operation_team'].includes(role)
        const canViewAlerts = ['super_admin', 'admin'].includes(role)

        const usersQuery = canViewUsers
          ? supabase.from('profiles').select('*', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 })

        const staffQuery = supabase
          .from('staff')
          .select('*', { count: 'exact', head: true })

        const idsQuery = supabase
          .from('staff_ids')
          .select('*', { count: 'exact', head: true })

        const alertsQuery = canViewAlerts
          ? supabase.from('security_events').select('*', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 })

        const [u, s, i, a] = await Promise.all([
          usersQuery,
          staffQuery,
          idsQuery,
          alertsQuery,
        ])

        setStats({
          users: u?.count || 0,
          staff: s?.count || 0,
          ids: i?.count || 0,
          alerts: a?.count || 0,
        })
      } catch (error) {
        console.error('Dashboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

  const role = profile?.role ?? ''

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
        icon: <Users className="h-5 w-5" />,
        highlight: false,
      })
    }

    if (permissions.canViewStaff) {
      items.push({
        title: 'Staff',
        value: stats.staff,
        icon: <Shield className="h-5 w-5" />,
        highlight: true,
      })
    }

    items.push({
      title: 'Digital IDs',
      value: stats.ids,
      icon: <IdCard className="h-5 w-5" />,
      highlight: false,
    })

    if (permissions.canViewAlerts) {
      items.push({
        title: 'Alerts',
        value: stats.alerts,
        icon: <Bell className="h-5 w-5" />,
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
      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="mt-1 text-slate-500">{welcomeText}</p>
      </div>

      <div
        className={`grid gap-4 ${
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
          <Card
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            highlight={card.highlight}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-lg font-semibold">Overview</h3>

            <div
              className={`mt-4 grid gap-4 ${
                overviewItems.length === 1
                  ? 'grid-cols-1'
                  : overviewItems.length === 2
                  ? 'grid-cols-2'
                  : overviewItems.length === 3
                  ? 'grid-cols-1 md:grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-4'
              }`}
            >
              {overviewItems.map((item) => (
                <Mini key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>

          {managementPanels.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {managementPanels.map((panel) => (
                <Panel
                  key={panel.href}
                  title={panel.title}
                  desc={panel.desc}
                  href={panel.href}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {quickActions.length > 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow">
              <h3 className="font-semibold">Quick Actions</h3>

              <div className="mt-4 space-y-3">
                {quickActions.map((action) => (
                  <Action
                    key={action.href}
                    href={action.href}
                    label={action.label}
                    icon={action.icon}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-[#081a33] p-6 text-white">
            <h3 className="text-lg font-semibold">Digital Identity</h3>
            <p className="mt-2 text-sm opacity-70">
              Verified IDs across system
            </p>

            <h2 className="mt-4 text-4xl font-bold">{stats.ids}</h2>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string
  value: number
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-5 shadow ${
        highlight ? 'bg-[#0094e0] text-white' : 'bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        {icon}
      </div>
      <h2 className="mt-4 text-3xl font-bold">{value}</h2>
    </div>
  )
}

function Mini({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-slate-100 p-4 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <h3 className="text-xl font-bold">{value}</h3>
    </div>
  )
}

function Panel({
  title,
  desc,
  href,
}: {
  title: string
  desc: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl bg-white p-5 shadow transition hover:shadow-md"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  )
}

function Action({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 text-sm transition hover:bg-slate-200"
    >
      <span className="text-slate-500">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}