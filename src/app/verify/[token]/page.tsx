import { notFound } from 'next/navigation'
import Image from 'next/image'
import logo from '@/assets/SGC-Security-Tag-White-Inverse-Logo.svg'
import {
  ShieldCheck,
  ShieldX,
  BadgeCheck,
  CalendarDays,
  IdCard,
  User,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: idData, error } = await supabase
    .from('guard_ids')
    .select(`
      id,
      id_number,
      role_title,
      expiry_date,
      issue_date,
      is_current,
      qr_token,
      status,
      guards (
        full_name,
        employee_code,
        company_name,
        status
      )
    `)
    .eq('qr_token', token)
    .single()

  if (error || !idData) {
    return notFound()
  }

  const guard = Array.isArray(idData.guards) ? idData.guards[0] : idData.guards

  if (!guard) {
    return notFound()
  }

  const isValid =
    idData.is_current &&
    idData.status === 'active' &&
    guard.status === 'active' &&
    new Date(idData.expiry_date) > new Date()

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,148,224,0.08),transparent_35%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Image
                src={logo}
                alt="SGC Security"
                className="h-auto w-[150px] object-contain"
                priority
              />
            </div>

            <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0094e0]/10">
              {isValid ? (
                <ShieldCheck className="h-7 w-7 text-[#0094e0]" />
              ) : (
                <ShieldX className="h-7 w-7 text-red-500" />
              )}
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
              ID Verification
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Confirm the guard identity and digital ID status.
            </p>
          </div>

          <div className="mt-8 rounded-[28px] bg-[#f8fafc] p-6 ring-1 ring-slate-200/80">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900">
                {guard.full_name}
              </h2>
              <p className="mt-1 text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                {idData.role_title}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <DetailRow
                icon={<User className="h-4 w-4 text-[#0094e0]" />}
                label="Employee Code"
                value={guard.employee_code}
              />
              <DetailRow
                icon={<IdCard className="h-4 w-4 text-[#0094e0]" />}
                label="ID Number"
                value={idData.id_number}
              />
              <DetailRow
                icon={<CalendarDays className="h-4 w-4 text-[#0094e0]" />}
                label="Issue Date"
                value={idData.issue_date || '—'}
              />
              <DetailRow
                icon={<CalendarDays className="h-4 w-4 text-[#0094e0]" />}
                label="Expiry Date"
                value={idData.expiry_date}
              />
              <DetailRow
                icon={<BadgeCheck className="h-4 w-4 text-[#0094e0]" />}
                label="ID Status"
                value={idData.status}
              />
            </div>

            <div className="mt-6">
              {isValid ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
                  <p className="text-2xl font-semibold text-emerald-700">
                    Valid ID
                  </p>
                  <p className="mt-2 text-sm text-emerald-600">
                    This digital ID is active and currently valid.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center">
                  <p className="text-2xl font-semibold text-red-700">
                    Invalid / Expired ID
                  </p>
                  <p className="mt-2 text-sm text-red-600">
                    This digital ID is not currently valid for verification.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  )
}