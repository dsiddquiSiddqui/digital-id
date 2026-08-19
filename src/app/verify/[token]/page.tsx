import type { CSSProperties } from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  BadgeCheck,
  CalendarDays,
  IdCard,
  ShieldCheck,
  ShieldX,
  User,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidVerificationToken } from '@/lib/verification-token'

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!isValidVerificationToken(token)) return notFound()

  const supabase = createAdminClient()

  const { data: idData, error } = await supabase
    .from('staff_ids')
    .select(`
      id,
      id_number,
      role_title,
      expiry_date,
      issue_date,
      is_current,
      qr_token,
      status,
      organizations:organizations (
        name,
        slug,
        logo_url,
        support_email,
        support_phone,
        verification_title,
        primary_color,
        accent_color,
        surface_color
      ),
      staff (
        full_name,
        employee_code,
        company_name,
        photo_url,
        status
      )
    `)
    .eq('qr_token', token)
    .maybeSingle()

  if (error || !idData) return notFound()

  const staff = Array.isArray(idData.staff) ? idData.staff[0] : idData.staff
  if (!staff) return notFound()

  const organization = Array.isArray(idData.organizations)
    ? idData.organizations[0] ?? null
    : idData.organizations ?? null

  const tenantStyle = {
    '--tenant-primary': organization?.primary_color || '#111827',
    '--tenant-accent': organization?.accent_color || '#2563eb',
    '--tenant-surface': organization?.surface_color || '#f8fafc',
  } as CSSProperties

  const isValid =
    idData.is_current &&
    idData.status === 'active' &&
    staff.status === 'active' &&
    new Date(idData.expiry_date) > new Date()

  const supportHref = organization?.support_email
    ? `mailto:${organization.support_email}`
    : organization?.support_phone
    ? `tel:${organization.support_phone.replace(/\s+/g, '')}`
    : null

  return (
    <main
      className="tenant-theme min-h-screen bg-[var(--tenant-surface)] px-5 py-8 text-slate-950"
      style={tenantStyle}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div className="bg-[var(--tenant-primary)] px-6 py-6 text-white md:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                  {organization?.logo_url ? (
                    <Image
                      unoptimized
                      src={organization.logo_url}
                      alt=""
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShieldCheck className="h-7 w-7" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
                    Staff verification
                  </p>
                  <h1 className="mt-1 text-2xl font-black">
                    {organization?.verification_title || organization?.name || 'Digital ID Verification'}
                  </h1>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
                  isValid
                    ? 'bg-emerald-400 text-emerald-950'
                    : 'bg-red-400 text-red-950'
                }`}
              >
                {isValid ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
                {isValid ? 'Valid ID' : 'Invalid or expired'}
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-slate-200 bg-slate-50 p-8 lg:border-b-0 lg:border-r">
              <div className="flex flex-col items-center text-center">
                <div className="relative h-40 w-40 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  {staff.photo_url ? (
                    <Image
                      unoptimized
                      src={staff.photo_url}
                      alt={staff.full_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-14 w-14 text-slate-300" />
                    </div>
                  )}
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-950">
                  {staff.full_name}
                </h2>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                  {idData.role_title}
                </p>
                <p className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
                  {staff.company_name}
                </p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-3">
                <DetailRow icon={<User className="h-4 w-4" />} label="Employee Code" value={staff.employee_code} />
                <DetailRow icon={<IdCard className="h-4 w-4" />} label="ID Number" value={idData.id_number} />
                <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Issue Date" value={idData.issue_date || '-'} />
                <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Expiry Date" value={idData.expiry_date} />
                <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="ID Status" value={idData.status} />
              </div>

              <div
                className={`mt-6 rounded-3xl border px-5 py-5 ${
                  isValid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                <p className="text-xl font-black">
                  {isValid ? 'This digital ID is active and current.' : 'This digital ID is not currently valid.'}
                </p>
                <p className="mt-2 text-sm leading-6 opacity-80">
                  Verification is based on the issuing organization record, staff status, ID status, and expiry date.
                </p>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-black text-slate-950">Need help?</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Contact {organization?.name || 'the issuing organization'} if this ID looks incorrect.
                </p>
                {supportHref ? (
                  <a
                    href={supportHref}
                    className="mt-4 inline-flex rounded-2xl bg-[var(--tenant-primary)] px-5 py-3 text-sm font-black text-white"
                  >
                    Contact support
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-[var(--tenant-primary)]">
        {icon}
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <span className="text-right text-sm font-bold text-slate-950">{value}</span>
    </div>
  )
}
