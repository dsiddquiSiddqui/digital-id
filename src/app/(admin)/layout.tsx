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
import logo from '@/assets/SGC-Security-Tag-White-Inverse-Logo.svg'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  auth_user_id: string
  role: string
  full_name: string
  email: string
  is_active?: boolean
}

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

        if (!['super_admin', 'admin'].includes(profileData.role)) {
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

  const pageTitle = useMemo(() => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/staff') return 'Staff'
    if (pathname === '/staff/new') return 'Create Staff'
    if (pathname.startsWith('/staff/') && pathname.endsWith('/edit')) return 'Edit Staff'
    if (pathname.startsWith('/staff/') && pathname.endsWith('/password')) return 'Reset Staff Password'
    if (pathname.startsWith('/staff/') && pathname.endsWith('/issue-id')) return 'Issue Digital ID'
    if (pathname.startsWith('/staff/')) return 'Staff Details'
    if (pathname === '/alerts') return 'Alerts'
    if (pathname === '/audit-logs') return 'Audit Logs'
    if (pathname === '/profile') return 'My Profile'
    if (pathname === '/users') return 'Users'
    if (pathname.startsWith('/users/') && pathname.endsWith('/edit')) return 'Edit User'
    if (pathname.startsWith('/users/') && pathname.endsWith('/password')) return 'Reset User Password'
    if (pathname.startsWith('/staff-ids/') && pathname.endsWith('/edit')) return 'Edit Digital ID'
    return 'Admin Panel'
  }, [pathname])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f8]">
        <div className="rounded-[28px] bg-white px-6 py-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="text-sm text-slate-600">Loading admin panel...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] p-4 text-slate-900 lg:p-6">
      <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[34px] border border-white/60 bg-[#f8fafc] shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:min-h-[calc(100vh-3rem)]">
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
              <div className="rounded-[26px] bg-[#eef6fb] px-4 py-5 ring-1 ring-slate-200/80">
                <div className="flex items-center justify-center">
                  <Image
                    src={logo}
                    alt="SGC Security"
                    className="h-auto w-[130px] object-contain"
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
            <p className="px-3 pb-3 mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Menu
            </p>

            <div className="space-y-1">
              <SidebarLink
                href="/dashboard"
                label="Dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                active={pathname === '/dashboard'}
              />
              <SidebarLink
                href="/staff"
                label="Staff"
                icon={<Shield className="h-4 w-4" />}
                active={pathname === '/staff' || pathname.startsWith('/staff/')}
              />
              <SidebarLink
                href="/staff/new"
                label="Create Staff"
                icon={<Plus className="h-4 w-4" />}
                active={pathname === '/staff/new'}
              />
              <SidebarLink
                href="/alerts"
                label="Alerts"
                icon={<Bell className="h-4 w-4" />}
                active={pathname === '/alerts'}
              />
              <SidebarLink
                href="/audit-logs"
                label="Audit Logs"
                icon={<FileText className="h-4 w-4" />}
                active={pathname === '/audit-logs'}
              />
              <SidebarLink
                href="/users"
                label="Users"
                icon={<Users className="h-4 w-4" />}
                active={pathname === '/users' || pathname.startsWith('/users/')}
              />
              <SidebarLink
                href="/profile"
                label="My Profile"
                icon={<User className="h-4 w-4" />}
                active={pathname === '/profile'}
              />
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
                    placeholder="Search dashboard..."
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
                    <p className="mt-1 text-xs text-slate-500">
                      {profile?.email}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </header>

          <div className="px-5 py-5 lg:px-8">
            <div className="mb-5">
              
             
            </div>

            {children}
          </div>
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