import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Fingerprint,
  IdCard,
  LockKeyhole,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { BILLING_PLANS, formatPlanLimit } from '@/lib/billing-plans'

const navItems = [
  { label: 'Product', href: '#product' },
  { label: 'Teams', href: '#teams' },
  { label: 'Packages', href: '#packages' },
  { label: 'Security', href: '#security' },
]

const workspaceTabs = [
  { label: 'Staff records', active: true },
  { label: 'Digital IDs', active: false },
  { label: 'Documents', active: false },
  { label: 'Audit log', active: false },
]

const productBlocks = [
  {
    icon: <IdCard className="h-5 w-5" />,
    title: 'Digital IDs',
    text: 'Issue current staff IDs with expiry dates, QR tokens, site details, and verification status.',
    accent: 'bg-[#fbe3d0]',
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: 'Documents',
    text: 'Keep licence files, right-to-work checks, notes, and expiry follow-up in the same profile.',
    accent: 'bg-[#dcebf9]',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Users',
    text: 'Give admins, HR, managers, and operations staff the right level of dashboard access.',
    accent: 'bg-[#e5f2d8]',
  },
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: 'Audit trail',
    text: 'Track sensitive actions, screenshot alerts, package changes, and workspace inspections.',
    accent: 'bg-[#f5e1f0]',
  },
]

const teamRows = [
  ['Owners', 'Create workspaces, choose packages, manage branding'],
  ['Admins', 'Add users, update settings, review audit logs'],
  ['HR teams', 'Maintain staff profiles, documents, and contacts'],
  ['Operations', 'Check IDs, alerts, sites, and active staff status'],
]

const securityItems = [
  'Tenant-separated organization workspaces',
  'Admin-only package changes',
  'Super-admin organization inspection with audit logs',
  'QR verification for public ID checks',
  'Role-based access for dashboard users',
  'Brand uploads for logo, favicon, and background',
]

const logos = ['NORTHGATE', 'CITADEL', 'VAULT', 'SENTRY', 'SHIFTBASE', 'AURORA']

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf8] text-[#191919]">
      <header className="sticky top-0 z-30 border-b border-[#e8e2da] bg-[#fbfaf8]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-7">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dfd7cd] bg-white text-[#191919]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-black tracking-[-0.01em]">
              Security ID
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 text-[15px] font-semibold text-[#4d4a45] transition hover:bg-[#f1eee9] hover:text-[#191919]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-2 text-[15px] font-bold text-[#4d4a45] transition hover:bg-[#f1eee9] sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-[#191919] px-4 py-2 text-[15px] font-black text-white transition hover:bg-black"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 pb-10 pt-14 text-center sm:px-7 lg:pb-12 lg:pt-18">
        <div className="mx-auto flex max-w-max items-center gap-2 rounded-full border border-[#e2dbd2] bg-white px-3 py-1.5 text-sm font-bold text-[#5f5a52] shadow-[0_1px_0_rgba(25,25,25,0.05)]">
          <LockKeyhole className="h-4 w-4 text-[#23845b]" />
          One workspace for staff identity
        </div>

        <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.04em] text-[#171717] sm:text-6xl lg:text-[88px]">
          The simple workspace for secure staff IDs.
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-xl font-semibold leading-8 tracking-[-0.01em] text-[#5f5a52]">
          Bring staff records, documents, digital ID cards, QR verification,
          users, packages, and audit logs into one calm operating system.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#191919] px-6 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/portal/login"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#d8d0c7] bg-white px-6 text-base font-black text-[#191919] transition hover:-translate-y-0.5 hover:bg-[#f6f3ee]"
          >
            Staff portal
            <Fingerprint className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-7">
        <div className="relative overflow-hidden rounded-xl border border-[#ded6cb] bg-white shadow-[0_18px_50px_rgba(25,25,25,0.08)]">
          <div className="flex flex-col gap-3 border-b border-[#ebe5dc] bg-[#f7f4ef] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff6b5f]" />
              <span className="h-3 w-3 rounded-full bg-[#f7bd45]" />
              <span className="h-3 w-3 rounded-full bg-[#46b579]" />
              <span className="ml-3 text-sm font-black text-[#5f5a52]">
                acme-security.workspace
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-[#e0d8cf] bg-white px-3 py-2 text-sm font-semibold text-[#726b62]">
              <Search className="h-4 w-4" />
              Search staff, IDs, documents...
            </div>
          </div>

          <div className="grid lg:grid-cols-[260px_1fr]">
            <aside className="border-b border-[#ebe5dc] bg-[#fbfaf8] p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3 rounded-md border border-[#e6dfd6] bg-white p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#191919] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-black">Acme Security</p>
                  <p className="text-xs font-semibold text-[#8a8379]">
                    Growth package
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                {workspaceTabs.map((tab) => (
                  <div
                    key={tab.label}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-bold ${
                      tab.active
                        ? 'bg-[#eee9e2] text-[#191919]'
                        : 'text-[#686158]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.active ? <ChevronRight className="h-4 w-4" /> : null}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-md border border-[#e5ded5] bg-[#fff8df] p-3 text-left">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8b641b]">
                  Alert
                </p>
                <p className="mt-2 text-sm font-bold leading-5 text-[#4f3d1a]">
                  6 documents expire in the next 30 days.
                </p>
              </div>
            </aside>

            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="text-left">
                  <p className="text-sm font-black text-[#8a8379]">
                    Staff identity
                  </p>
                  <h2 className="mt-1 text-3xl font-black tracking-[-0.03em]">
                    Active team board
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Staff" value="748" />
                  <MiniStat label="IDs" value="721" />
                  <MiniStat label="Alerts" value="06" />
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]">
                <div className="overflow-hidden rounded-lg border border-[#e5ded5]">
                  <table className="w-full min-w-[560px] text-left">
                    <thead className="bg-[#fbfaf8] text-xs font-black uppercase tracking-[0.1em] text-[#8a8379]">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Docs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee8df] text-sm font-bold">
                      <StaffRow name="Amina Khan" role="Site supervisor" id="Valid" docs="Ready" />
                      <StaffRow name="Musa Patel" role="Door supervisor" id="Valid" docs="Review" muted />
                      <StaffRow name="Leah Morris" role="Event guard" id="Expires soon" docs="Ready" />
                      <StaffRow name="Noah Price" role="Control room" id="Valid" docs="Ready" muted />
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-[#e5ded5] bg-[#fbfaf8] p-4 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-[#8a8379]">
                      Digital ID preview
                    </p>
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="mt-4 rounded-lg border border-[#ded6cb] bg-white p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-14 w-14 items-center justify-center rounded-md bg-[#fbe3d0] text-xl font-black">
                        AK
                      </span>
                      <div>
                        <p className="font-black">Amina Khan</p>
                        <p className="text-sm font-semibold text-[#6d665d]">
                          ID-2048
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
                      <div className="space-y-2 text-sm font-semibold text-[#5f5a52]">
                        <p>Valid until 24 Jan 2027</p>
                        <p>North Gate</p>
                        <p>SIA verified</p>
                      </div>
                      <div className="flex h-20 w-20 items-center justify-center rounded-md border border-[#ded6cb] bg-[#fbfaf8]">
                        <QrCode className="h-12 w-12" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-md bg-[#e5f2d8] px-3 py-2 text-sm font-black text-[#315f20]">
                    <BadgeCheck className="h-4 w-4" />
                    Public verification active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e8e2da] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-7 text-center sm:px-7">
          <p className="text-sm font-black text-[#6b645b]">
            Built for teams that need clean records and fast checks
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs font-black tracking-[0.16em] text-[#9b9388] sm:grid-cols-3 lg:grid-cols-6">
            {logos.map((logo) => (
              <span key={logo} className="rounded-md border border-[#eee8df] py-3">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8a8379]">
            Bring the work together
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-6xl">
            Records, IDs, documents, and checks. All in one workspace.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {productBlocks.map((block) => (
            <article
              key={block.title}
              className="rounded-lg border border-[#e5ded5] bg-white p-6 shadow-[0_1px_0_rgba(25,25,25,0.04)]"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-md ${block.accent}`}>
                {block.icon}
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.02em]">
                {block.title}
              </h3>
              <p className="mt-3 text-base font-semibold leading-7 text-[#615a52]">
                {block.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="teams" className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-16 sm:px-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:pb-20">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8a8379]">
            For every role
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
            A workspace that feels simple for everyone.
          </h2>
          <p className="mt-5 text-lg font-semibold leading-8 text-[#615a52]">
            Owners see packages and branding. Admins control access. HR keeps
            records clean. Operations checks the live ID picture.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e5ded5] bg-white">
          {teamRows.map(([role, text]) => (
            <div
              key={role}
              className="grid gap-2 border-b border-[#eee8df] p-5 last:border-b-0 sm:grid-cols-[180px_1fr]"
            >
              <p className="font-black">{role}</p>
              <p className="font-semibold leading-7 text-[#615a52]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="packages" className="border-y border-[#e8e2da] bg-[#f7f4ef]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8a8379]">
                Packages
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
                Start small. Scale cleanly.
              </h2>
            </div>
            <p className="max-w-2xl text-base font-semibold leading-7 text-[#615a52]">
              Admin users are dashboard seats. Staff records are the people
              whose profiles, documents, and digital IDs you manage.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {BILLING_PLANS.map((plan) => {
              const active = plan.key === 'growth'

              return (
                <article
                  key={plan.key}
                  className={`rounded-lg border p-5 ${
                    active
                      ? 'border-[#191919] bg-[#191919] text-white'
                      : 'border-[#e0d8cf] bg-white'
                  }`}
                >
                  <p
                    className={`text-sm font-black ${
                      active ? 'text-[#f5d48a]' : 'text-[#8a8379]'
                    }`}
                  >
                    {plan.highlight}
                  </p>
                  <h3 className="mt-3 text-2xl font-black">{plan.name}</h3>
                  <p className="mt-3 text-3xl font-black tracking-[-0.03em]">
                    {plan.monthlyPrice === null ? 'Custom' : `GBP ${plan.monthlyPrice}`}
                  </p>
                  <div
                    className={`mt-5 space-y-2 text-sm font-bold ${
                      active ? 'text-white/75' : 'text-[#615a52]'
                    }`}
                  >
                    <p>{formatPlanLimit(plan.userLimit, 'admin users')}</p>
                    <p>{formatPlanLimit(plan.staffLimit, 'staff records')}</p>
                  </div>
                  <Link
                    href={`/signup?plan=${plan.key}`}
                    className={`mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-md text-sm font-black ${
                      active
                        ? 'bg-white text-[#191919] hover:bg-[#f7f4ef]'
                        : 'bg-[#191919] text-white hover:bg-black'
                    }`}
                  >
                    Choose
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-7 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8a8379]">
              Security and control
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              Built for trust from the first workspace.
            </h2>
            <p className="mt-5 text-lg font-semibold leading-8 text-[#615a52]">
              Keep the product reliable with clear ownership, logged changes,
              tenant-aware settings, and role permissions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {securityItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-lg border border-[#e5ded5] bg-white p-4"
              >
                <Check className="mt-1 h-4 w-4 shrink-0" />
                <p className="font-bold leading-6 text-[#504a43]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-7">
        <div className="rounded-xl border border-[#191919] bg-[#191919] px-6 py-10 text-center text-white sm:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-white text-[#191919]">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">
            Create a workspace your clients can trust.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-white/70">
            Launch your branded security ID system, add your team, and keep
            every profile ready for inspection.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-6 font-black text-[#191919] transition hover:bg-[#f7f4ef]"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/20 px-6 font-black text-white transition hover:bg-white/10"
            >
              Log in
              <Eye className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md border border-[#e5ded5] bg-white px-3 py-2 text-left">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#9b9388]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black tracking-[-0.03em]">{value}</p>
    </div>
  )
}

function StaffRow({
  name,
  role,
  id,
  docs,
  muted = false,
}: {
  name: string
  role: string
  id: string
  docs: string
  muted?: boolean
}) {
  return (
    <tr className={muted ? 'bg-[#fbfaf8]' : 'bg-white'}>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eee9e2] text-xs font-black">
            {name
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </span>
          <span>{name}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-[#6d665d]">{role}</td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-[#e5f2d8] px-2.5 py-1 text-xs text-[#315f20]">
          {id}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-[#f7f4ef] px-2.5 py-1 text-xs text-[#5f5a52]">
          {docs}
        </span>
      </td>
    </tr>
  )
}
