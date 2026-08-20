'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import {
  LayoutDashboard,
  Shield,
  Bell,
  FileText,
  LogOut,
  LogIn,
  Menu,
  X,
  Users,
  Mail,
  ChevronRight,
  Settings,
  ClipboardCheck,
  FileBarChart,
  ShieldCheck,
  FileSpreadsheet,
  ListChecks,
  IdCard,
  Workflow,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LegalConsentBanner from '@/components/LegalConsentBanner'
import AdminCommandBar from '@/components/admin/AdminCommandBar'
import { ToastProvider } from '@/components/admin/ToastProvider'

type Profile = {
  id: string
  organization_id?: string | null
  auth_user_id: string
  role: string
  full_name: string
  email: string
  is_active?: boolean
  organizations?: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    background_image_url: string | null
    theme_key: string
    primary_color: string
    accent_color: string
    surface_color: string
  } | null
}

const ALLOWED_LAYOUT_ROLES = [
  'super_admin',
  'admin',
  'manager',
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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
          .select(
            '*, organizations:organizations(id, name, slug, logo_url, background_image_url, theme_key, primary_color, accent_color, surface_color)'
          )
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

        if (profileData.role === 'super_admin' && profileData.organization_id) {
          const sessionResponse = await fetch('/api/platform/organizations/session')
          const sessionResult = await sessionResponse.json().catch(() => null)

          if (sessionResult?.expired || sessionResult?.redirect_to) {
            router.push(sessionResult.redirect_to || '/platform/organizations')
            return
          }
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

  useEffect(() => {
    if (!profile) return
    const record = () => {
      fetch('/api/session/activity', { method: 'POST' }).catch(() => null)
    }
    record()
    const timer = window.setInterval(record, 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [profile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleLeaveWorkspace = async () => {
    await fetch('/api/platform/organizations/leave', {
      method: 'POST',
    })
    router.push('/platform/organizations')
  }

  const role = profile?.role ?? ''
  const organization = profile?.organizations ?? null
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
      canManageSettings: isSuperAdmin || isAdmin,

      isSuperAdmin,
      isAdmin,
      isHrManager,
      isHr,
      isOperationManager,
      isOperationTeam,
    }
  }, [role])

  const staffAreaActive =
    pathname === '/v2/staff' ||
    pathname.startsWith('/v2/staff/') ||
    pathname.startsWith('/v2/staff-ids/') ||
    pathname.startsWith('/staff/') ||
    pathname.startsWith('/staff-ids/')
  const sidebarSections = [
    {
      title: 'Workspace',
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />,
          active: pathname === '/dashboard',
        },
        permissions.canViewStaff
          ? {
              href: '/v2/staff',
              label: 'Staff',
              icon: <Shield className="h-4 w-4" />,
              active: staffAreaActive,
            }
          : null,
        permissions.canViewStaff
          ? {
              href: '/reports',
              label: 'Reports',
              icon: <FileBarChart className="h-4 w-4" />,
              active: pathname === '/reports',
            }
          : null,
        permissions.canViewStaff
          ? {
              href: '/notifications',
              label: 'Inbox',
              icon: <Mail className="h-4 w-4" />,
              active: pathname === '/notifications',
            }
          : null,
      ],
    },
    {
      title: 'Operations',
      items: [
        permissions.canViewAlerts
          ? {
              href: '/alerts',
              label: 'Alerts',
              icon: <Bell className="h-4 w-4" />,
              active: pathname === '/alerts',
            }
          : null,
        permissions.canViewStaff
          ? {
              href: '/expiry-alerts',
              label: 'Expiry alerts',
              icon: <FileText className="h-4 w-4" />,
              active: pathname === '/expiry-alerts',
            }
          : null,
        permissions.canViewStaff
          ? {
              href: '/document-renewals',
              label: 'Renewals',
              icon: <ClipboardCheck className="h-4 w-4" />,
              active: pathname === '/document-renewals',
            }
          : null,
        permissions.canBulkUploadStaff
          ? {
              href: '/bulk-actions',
              label: 'Bulk actions',
              icon: <FileSpreadsheet className="h-4 w-4" />,
              active: pathname === '/bulk-actions',
            }
          : null,
      ],
    },
    permissions.canManageSettings
      ? {
          title: 'Build',
          items: [
            {
              href: '/setup-wizard',
              label: 'Setup wizard',
              icon: <ListChecks className="h-4 w-4" />,
              active: pathname === '/setup-wizard',
            },
            {
              href: '/id-card-designer',
              label: 'ID designer',
              icon: <IdCard className="h-4 w-4" />,
              active: pathname === '/id-card-designer',
            },
            {
              href: '/automations',
              label: 'Automations',
              icon: <Workflow className="h-4 w-4" />,
              active: pathname === '/automations',
            },
          ],
        }
      : null,
    permissions.canViewUsers || permissions.canManageSettings
      ? {
          title: 'Admin',
          items: [
            permissions.canViewUsers
              ? {
                  href: '/users',
                  label: 'Users',
                  icon: <Users className="h-4 w-4" />,
                  active: pathname.startsWith('/users'),
                }
              : null,
            permissions.canManageSettings
              ? {
                  href: '/settings',
                  label: 'Settings',
                  icon: <Settings className="h-4 w-4" />,
                  active: pathname.startsWith('/settings'),
                }
              : null,
            permissions.canManageSettings
              ? {
                  href: '/security-center',
                  label: 'Security',
                  icon: <ShieldCheck className="h-4 w-4" />,
                  active: pathname === '/security-center',
                }
              : null,
          ],
        }
      : null,
  ]
    .filter(Boolean)
    .map((section) => ({
      ...section!,
      items: section!.items.filter(Boolean) as Array<{
        href: string
        label: string
        icon: React.ReactNode
        active: boolean
      }>,
    }))
    .filter((section) => section.items.length > 0)

  type SidebarItem = {
    href: string
    label: string
    icon: React.ReactNode
    active: boolean
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--dx-canvas)]">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--dx-line)] bg-white px-5 py-4 shadow-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--dx-signal)] ring-4 ring-[var(--dx-ink)]" />
          <p className="text-sm font-bold text-[var(--dx-muted-strong)]">Opening Digital ID X…</p>
        </div>
      </main>
    )
  }

  return (
    <ToastProvider>
    <main className="min-h-screen bg-[var(--dx-canvas)] text-[var(--dx-ink)]">
      <div className="flex min-h-screen overflow-x-hidden">
        {mobileSidebarOpen ? (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-white/10 bg-[#111612] text-white shadow-[8px_0_30px_rgba(16,24,20,0.08)] transition-[width,transform] duration-300 lg:translate-x-0 ${
            sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'
          } ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="border-b border-white/10 px-3 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className={`flex h-11 items-center rounded-lg bg-white px-3 shadow-sm transition-all ${sidebarCollapsed ? 'lg:justify-center lg:px-1.5' : ''}`}>
                  <NextImage src="/digital-id-x-logo.png" alt="Digital ID X" width={800} height={134} priority className={`h-auto w-[174px] ${sidebarCollapsed ? 'lg:hidden' : ''}`} />
                  <NextImage src="/digital-id-x-icon.png" alt="" width={166} height={134} className={`hidden h-8 w-auto ${sidebarCollapsed ? 'lg:block' : ''}`} />
                </div>
                {organization ? (
                  <div className={`mt-2.5 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.055] p-2.5 transition ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`} title={sidebarCollapsed ? organization.name : undefined}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/10 text-xs font-bold text-white">
                      {organization.logo_url ? <NextImage unoptimized src={organization.logo_url} alt="" width={36} height={36} className="h-full w-full object-cover" /> : organization.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                      <p className="truncate text-sm font-semibold text-white">{organization.name}</p>
                      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">{organization.slug}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`mt-2.5 hidden h-8 items-center rounded-lg text-xs font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white lg:flex ${sidebarCollapsed ? 'w-full justify-center' : 'w-full justify-between px-2.5'}`}
              aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              title={sidebarCollapsed ? 'Expand navigation' : undefined}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><span>Collapse sidebar</span><PanelLeftClose className="h-4 w-4" /></>}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-5 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]" aria-label="Workspace navigation">
            <div className="mt-4 space-y-5">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  <p className={`px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40 ${sidebarCollapsed ? 'lg:sr-only' : ''}`}>
                    {section.title}
                  </p>
                  {sidebarCollapsed ? <div className="mx-auto mb-2 hidden h-px w-7 bg-white/10 lg:block" /> : null}
                  <div className="space-y-1">
                    {section.items.map((item: SidebarItem) => (
                      <SidebarLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={item.active}
                        collapsed={sidebarCollapsed}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            {role === 'super_admin' && organization ? (
              <button
                onClick={handleLeaveWorkspace}
                className={`mb-3 flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 ${sidebarCollapsed ? 'lg:justify-center lg:p-2' : ''}`}
                title={sidebarCollapsed ? 'Exit workspace' : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-amber-100 p-2">
                    <LogIn className="h-4 w-4 rotate-180" />
                  </div>
                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Exit workspace</span>
                </div>
                <ChevronRight className={`h-4 w-4 text-amber-500 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />
              </button>
            ) : null}

            <button
              onClick={handleLogout}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white ${sidebarCollapsed ? 'lg:justify-center lg:p-2' : ''}`}
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-white/[0.07] p-2 transition group-hover:bg-white/10">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Logout</span>
              </div>
              <ChevronRight className={`h-4 w-4 text-white/25 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />
            </button>
          </div>
        </aside>

        <div className={`min-w-0 flex-1 transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
          {role === 'super_admin' && organization ? (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-amber-900 lg:px-8">
              <div className="flex flex-col gap-3 text-sm font-semibold md:flex-row md:items-center md:justify-between">
                <span>
                  Super admin audit mode: viewing {organization.name}. This access expires after 30 minutes and all changes are audited.
                </span>
                <button
                  onClick={handleLeaveWorkspace}
                  className="inline-flex items-center justify-center rounded-full bg-amber-900 px-4 py-2 text-xs font-black text-white"
                >
                  Exit workspace
                </button>
              </div>
            </div>
          ) : null}

          <header className="sticky top-0 z-30 border-b border-[var(--dx-line)] bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-5 lg:px-8">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open navigation"
                  className="rounded-xl border border-[var(--dx-line)] bg-white p-2 text-[var(--dx-muted-strong)] hover:bg-[var(--dx-surface-muted)] lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <AdminCommandBar />
              </div>

              <div className="flex items-center gap-3">
                <Link href="/notifications" aria-label="Open notifications" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dx-line)] bg-white text-[var(--dx-muted)] transition hover:border-[var(--dx-line-strong)] hover:bg-[var(--dx-surface-muted)]">
                  <Bell className="h-4 w-4" />
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-lg border border-transparent px-1.5 py-1 transition hover:border-[var(--dx-line)] hover:bg-[var(--dx-surface-muted)] sm:pr-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dx-signal)] text-sm font-bold text-white">
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

          <div className="px-4 py-5 sm:px-5 lg:px-8 lg:py-6">{children}</div>
          <LegalConsentBanner />
        </div>
      </div>
    </main>
    </ToastProvider>
  )
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active?: boolean
  collapsed?: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-semibold transition ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-2' : ''} ${
        active
          ? 'bg-white/[0.09] text-white ring-1 ring-inset ring-white/10 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-r-full before:bg-[#38b66a]'
          : 'text-white/62 hover:bg-white/[0.055] hover:text-white'
      }`}
    >
      <span
        className={`transition ${
          active ? 'text-[#38b66a]' : 'text-white/38 group-hover:text-white/75'
        }`}
      >
        {icon}
      </span>
      <span className={collapsed ? 'lg:sr-only' : ''}>{label}</span>
    </Link>
  )
}
