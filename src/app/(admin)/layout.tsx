'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Shield,
  Bell,
  FileText,
  LogOut,
  Menu,
  X,
  Plus,
  User,
  Users,
  Search,
  Mail,
  ChevronRight,
} from 'lucide-react'
import Image from 'next/image'
import logo from '@/assets/SGC-Security-Tag-Logo.svg'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  auth_user_id: string
  role: string
  full_name: string
  email: string
  is_active?: boolean
}

const ALLOWED_LAYOUT_ROLES = [
  'super_admin',
  'admin',
  'hr_manager',
  'hr',
  'operation_manager',
  'operation_team',
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .single()

        if (error || !profileData) {
          await supabase.auth.signOut()
          router.push('/login')
          return
        }

        if (!ALLOWED_LAYOUT_ROLES.includes(profileData.role)) {
          await supabase.auth.signOut()
          router.push('/login')
          return
        }

        setProfile(profileData)
      } catch (error) {
        console.error('Admin layout error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const role = profile?.role ?? ''

  const permissions = useMemo(() => {
    const isSuperAdmin = role === 'super_admin'
    const isAdmin = role === 'admin'
    const isHrManager = role === 'hr_manager'
    const isHr = role === 'hr'
    const isOperationManager = role === 'operation_manager'
    const isOperationTeam = role === 'operation_team'

    return {
      canViewDashboard: true,

      canViewStaff: [
        'super_admin',
        'admin',
        'hr_manager',
        'hr',
        'operation_manager',
        'operation_team',
      ].includes(role),

      canBulkUploadStaff: [
        'super_admin',
        'admin',
        'hr_manager',
        'hr',
      ].includes(role),

      canViewAlerts: isSuperAdmin || isAdmin,
      canViewAuditLogs: isSuperAdmin || isAdmin,

      canViewUsers: !['operation_manager', 'operation_team'].includes(role),

      canViewProfile: true,

      isSuperAdmin,
      isAdmin,
      isHrManager,
      isHr,
      isOperationManager,
      isOperationTeam,
    }
  }, [role])

  const pageTitle = useMemo(() => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/v2/staff') return 'Staff'
    if (pathname === '/v2/staff/new') return 'Create Staff'
    if (pathname === '/v2/staff/bulk-upload') return 'Bulk Upload Staff'
    if (pathname.startsWith('/v2/staff/') && pathname.endsWith('/edit')) return 'Edit Staff'
    if (pathname.startsWith('/v2/staff/') && pathname.endsWith('/password')) return 'Reset Staff Password'
    if (pathname.startsWith('/v2/staff/') && pathname.endsWith('/issue-id')) return 'Issue Digital ID'
    if (pathname.startsWith('/v2/staff/')) return 'Staff Details'
    if (pathname === '/alerts') return 'Alerts'
    if (pathname === '/audit-logs') return 'Audit Logs'
    if (pathname === '/profile') return 'My Profile'
    if (pathname === '/users') return 'Users'
    if (pathname.startsWith('/users/') && pathname.endsWith('/edit')) return 'Edit User'
    if (pathname.startsWith('/users/') && pathname.endsWith('/password')) return 'Reset User Password'
    if (pathname.startsWith('/staff-ids/') && pathname.endsWith('/edit')) return 'Edit Digital ID'
    return 'Admin Panel'
  }, [pathname])

  const sidebarItems = [
    permissions.canViewDashboard
      ? {
          href: '/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />,
          active: pathname === '/dashboard',
        }
      : null,

    permissions.canViewStaff
      ? {
          href: '/v2/staff',
          label: 'Staff',
          icon: <Shield className="h-4 w-4" />,
          active:
            pathname === '/v2/staff' ||
            pathname.startsWith('/v2/staff/') ||
            pathname.startsWith('/staff/'),
        }
      : null,

    permissions.canBulkUploadStaff
      ? {
          href: '/v2/staff/bulk-upload',
          label: 'Bulk Upload Staff',
          icon: <Plus className="h-4 w-4" />,
          active: pathname === '/v2/staff/bulk-upload',
        }
      : null,

    permissions.canViewAlerts
      ? {
          href: '/alerts',
          label: 'Alerts',
          icon: <Bell className="h-4 w-4" />,
          active: pathname === '/alerts',
        }
      : null,

    permissions.canViewAuditLogs
      ? {
          href: '/audit-logs',
          label: 'Audit Logs',
          icon: <FileText className="h-4 w-4" />,
          active: pathname === '/audit-logs',
        }
      : null,

    permissions.canViewUsers
      ? {
          href: '/users',
          label: 'Users',
          icon: <Users className="h-4 w-4" />,
          active: pathname === '/users' || pathname.startsWith('/users/'),
        }
      : null,

    permissions.canViewProfile
      ? {
          href: '/profile',
          label: 'My Profile',
          icon: <User className="h-4 w-4" />,
          active: pathname === '/profile',
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string
    label: string
    icon: React.ReactNode
    active: boolean
  }>

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center ">
        <div className="rounded-[28px] bg-white px-6 py-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="text-sm text-slate-600">Loading admin panel...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen  p-4 text-slate-900 lg:p-6">
      <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[34px] border border-white/60 bg-[#f8fafcdb] shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:min-h-[calc(100vh-3rem)]">
        {mobileSidebarOpen ? (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed left-0 top-0 z-50 flex h-screen w-[270px] flex-col border-r border-slate-200/70 bg-[#f8fafc] transition-transform duration-300 lg:static lg:h-auto lg:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="border-b border-slate-200/70 px-5 py-5">
            <div className="flex items-center justify-between lg:justify-center">
              <div className="">
                <div className="flex items-center justify-center">
                  <Image
                    src={logo}
                    alt="SGC Security"
                    className="h-auto w-[260px] object-contain"
                    priority
                  />
                </div>
              </div>

              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <p className="mt-3 px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Menu
            </p>

            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={item.active}
                />
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2 transition group-hover:bg-slate-200">
                  <LogOut className="h-4 w-4" />
                </div>
                <span>Logout</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </aside>

        <div className="flex-1 lg:pl-0">
          <header className="border-b border-slate-200/70 bg-[#f8fafc] px-5 py-4 lg:px-8">
            <div className="flex items-center justify-between gap-4 rounded-[26px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="hidden items-center rounded-2xl bg-[#f8fafc] px-4 py-3 ring-1 ring-slate-200 md:flex">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${pageTitle.toLowerCase()}...`}
                    className="w-[260px] bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200">
                    ⌘ F
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8fafc] text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100">
                  <Mail className="h-4 w-4" />
                </button>

                <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8fafc] text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100">
                  <Bell className="h-4 w-4" />
                </button>

                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-full bg-[#f8fafc] px-3 py-2 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0094e0]/15 text-sm font-bold text-[#0094e0]">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold leading-none text-slate-900">
                      {profile?.full_name}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {profile?.role?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </header>

          <div className="px-5 py-5 lg:px-8">{children}</div>
        </div>
      </div>
    </main>
  )
}

function SidebarLink({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition ${
        active
          ? 'bg-[#0094e0] text-white shadow-sm'
          : 'text-slate-600 hover:bg-white hover:text-slate-900'
      }`}
    >
      <span
        className={`transition ${
          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}