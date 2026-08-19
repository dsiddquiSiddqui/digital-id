'use client'

import type { CSSProperties } from 'react'
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
  User,
  Users,
  Mail,
  ChevronRight,
  Settings,
  BadgeDollarSign,
  ClipboardCheck,
  FileBarChart,
  ShieldCheck,
  LifeBuoy,
  FileSpreadsheet,
  CreditCard,
  GitBranch,
  CheckSquare,
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
  const tenantStyle = {
    '--tenant-primary': organization?.primary_color || '#0094e0',
    '--tenant-accent': organization?.accent_color || '#081a33',
    '--tenant-surface': organization?.surface_color || '#f8fafc',
    '--brand': organization?.primary_color || '#0094e0',
    ...(organization?.background_image_url
      ? {
          backgroundImage: `linear-gradient(rgba(248,250,252,0.88), rgba(248,250,252,0.88)), url(${organization.background_image_url})`,
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }
      : {}),
  } as CSSProperties

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

  const pageTitle = useMemo(() => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/v2/staff') return 'Staff'
    if (pathname === '/v2/staff/new') return 'Create Staff'
    if (pathname === '/v2/staff/bulk-upload') return 'Bulk Upload Staff'
    if (pathname.startsWith('/v2/staff/') && pathname.endsWith('/edit')) return 'Edit Staff'
    if (pathname.startsWith('/v2/staff/') && pathname.endsWith('/password')) return 'Reset Staff Password'
    if (pathname.startsWith('/v2/staff/') && pathname.endsWith('/issue-id')) return 'Issue Digital ID'
    if (pathname.startsWith('/v2/staff/') && pathname.endsWith('/checklist')) return 'Document Checklist'
    if (pathname.startsWith('/v2/staff/')) return 'Staff Details'
    if (pathname === '/alerts') return 'Alerts'
    if (pathname === '/expiry-alerts') return 'Expiry Alerts'
    if (pathname === '/billing') return 'Billing'
    if (pathname === '/reports') return 'Reports'
    if (pathname === '/notifications') return 'Notifications'
    if (pathname === '/document-renewals') return 'Document Renewals'
    if (pathname === '/imports') return 'Import History'
    if (pathname === '/bulk-actions') return 'Bulk Actions'
    if (pathname === '/id-card-designer') return 'ID Card Designer'
    if (pathname === '/custom-domains') return 'Custom Domains'
    if (pathname === '/automations') return 'Workflow Automations'
    if (pathname === '/setup-wizard') return 'Setup Wizard'
    if (pathname === '/enterprise-health') return 'Enterprise Health'
    if (pathname === '/launch-checklist') return 'Launch Checklist'
    if (pathname === '/email-templates') return 'Email Templates'
    if (pathname === '/scheduled-jobs') return 'Scheduled Jobs'
    if (pathname === '/permission-audit') return 'Permission Audit'
    if (pathname === '/production-readiness') return 'Production Readiness'
    if (pathname === '/security-center') return 'Security Center'
    if (pathname === '/onboarding-checklist') return 'Onboarding Checklist'
    if (pathname === '/help') return 'Help Center'
    if (pathname === '/audit-logs') return 'Audit Logs'
    if (pathname === '/profile') return 'My Profile'
    if (pathname === '/settings') return 'Organization Settings'
    if (pathname === '/settings/permissions') return 'Role Permissions'
    if (pathname === '/users') return 'Users'
    if (pathname === '/users/invite') return 'Invite User'
    if (pathname.startsWith('/users/') && pathname.endsWith('/edit')) return 'Edit User'
    if (pathname.startsWith('/users/') && pathname.endsWith('/password')) return 'Reset User Password'
    if (pathname.startsWith('/staff-ids/') && pathname.endsWith('/edit')) return 'Edit Digital ID'
    return 'Admin Panel'
  }, [pathname])

  const sidebarSections = [
    {
      title: 'Workspace',
      items: [
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
              label: 'Notifications',
              icon: <Bell className="h-4 w-4" />,
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
              label: 'Expiry Alerts',
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
              label: 'Bulk Actions',
              icon: <FileSpreadsheet className="h-4 w-4" />,
              active:
                pathname === '/bulk-actions' ||
                pathname === '/imports' ||
                pathname === '/v2/staff/bulk-upload',
            }
          : null,
      ],
    },
    {
      title: 'Build',
      items: [
        permissions.canManageSettings
          ? {
              href: '/setup-wizard',
              label: 'Setup Wizard',
              icon: <CheckSquare className="h-4 w-4" />,
              active:
                pathname === '/setup-wizard' ||
                pathname === '/onboarding-checklist' ||
                pathname === '/launch-checklist' ||
                pathname === '/production-readiness',
            }
          : null,
        permissions.canManageSettings
          ? {
              href: '/id-card-designer',
              label: 'ID Designer',
              icon: <CreditCard className="h-4 w-4" />,
              active: pathname === '/id-card-designer',
            }
          : null,
        permissions.canManageSettings
          ? {
              href: '/automations',
              label: 'Automations',
              icon: <GitBranch className="h-4 w-4" />,
              active: pathname === '/automations',
            }
          : null,
      ],
    },
    {
      title: 'Admin',
      items: [
        permissions.canViewUsers
          ? {
              href: '/users',
              label: 'Users',
              icon: <Users className="h-4 w-4" />,
              active: pathname === '/users' || pathname.startsWith('/users/'),
            }
          : null,
        permissions.canManageSettings
          ? {
              href: '/billing',
              label: 'Billing',
              icon: <BadgeDollarSign className="h-4 w-4" />,
              active: pathname === '/billing',
            }
          : null,
        permissions.canManageSettings
          ? {
              href: '/security-center',
              label: 'Security',
              icon: <ShieldCheck className="h-4 w-4" />,
              active:
                pathname === '/security-center' ||
                pathname === '/permission-audit' ||
                pathname === '/audit-logs',
            }
          : null,
        permissions.canManageSettings
          ? {
              href: '/settings',
              label: 'Settings',
              icon: <Settings className="h-4 w-4" />,
              active:
                pathname === '/settings' ||
                pathname === '/settings/permissions' ||
                pathname === '/custom-domains' ||
                pathname === '/email-templates' ||
                pathname === '/scheduled-jobs' ||
                pathname === '/enterprise-health',
            }
          : null,
      ],
    },
    {
      title: 'Support',
      items: [
        permissions.canViewProfile
          ? {
              href: '/help',
              label: 'Docs & Tickets',
              icon: <LifeBuoy className="h-4 w-4" />,
              active: pathname === '/help',
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
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter(Boolean) as Array<{
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
      <main className="flex min-h-screen items-center justify-center ">
        <div className="rounded-[28px] bg-white px-6 py-4 shadow-sm ring-1 ring-slate-200/80">
          <p className="text-sm text-slate-600">Loading admin panel...</p>
        </div>
      </main>
    )
  }

  return (
    <ToastProvider>
    <main className="tenant-theme min-h-screen p-4 text-slate-900 lg:p-6" style={tenantStyle}>
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
              <div className="w-full">
                <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--tenant-primary)] text-white">
                    {organization?.logo_url ? (
                      <NextImage
                        unoptimized
                        src={organization.logo_url}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Shield className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      Security ID
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Workspace
                    </p>
                  </div>
                </div>
                {organization ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {organization.name}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {organization.slug}
                    </p>
                  </div>
                ) : null}
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
            <div className="mt-4 space-y-5">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item: SidebarItem) => (
                      <SidebarLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={item.active}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-200">
              Press Ctrl K for advanced tools, imports, domains, jobs, audit logs, and launch checks.
            </p>
          </nav>

          <div className="border-t border-slate-200 p-4">
            {role === 'super_admin' && organization ? (
              <button
                onClick={handleLeaveWorkspace}
                className="mb-3 flex w-full items-center justify-between rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-2">
                    <LogIn className="h-4 w-4 rotate-180" />
                  </div>
                  <span>Exit workspace</span>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500" />
              </button>
            ) : null}

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

          <header className="border-b border-slate-200/70 bg-[#f8fafc] px-5 py-4 lg:px-8">
            <div className="flex items-center justify-between gap-4 rounded-[26px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <AdminCommandBar pageTitle={pageTitle} />
              </div>

              <div className="flex items-center gap-3">
                <Link href="/email-templates" aria-label="Open email templates" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8fafc] text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100">
                  <Mail className="h-4 w-4" />
                </Link>

                <Link href="/notifications" aria-label="Open notifications" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8fafc] text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100">
                  <Bell className="h-4 w-4" />
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-full bg-[#f8fafc] px-3 py-2 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tenant-primary)_14%,white)] text-sm font-bold text-[var(--tenant-primary)]">
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
          ? 'bg-[var(--tenant-primary)] text-white shadow-sm'
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
