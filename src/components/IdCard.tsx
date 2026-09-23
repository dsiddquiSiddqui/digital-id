'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import {
  DEFAULT_ID_CARD_TEMPLATE,
  type IdCardTemplate,
} from '@/lib/id-card-template'

type Props = {
  fullName: string
  employeeCode: string
  roleTitle: string
  idNumber: string
  qrToken: string
  photoUrl?: string | null
  issueDate?: string | null
  expiryDate?: string | null
  idStatus?: string | null
  siaNumber?: string | null
  template?: IdCardTemplate
  organizationName?: string | null
  organizationLogoUrl?: string | null
}

export default function IdCard({
  fullName,
  employeeCode,
  roleTitle,
  idNumber,
  qrToken,
  photoUrl,
  issueDate,
  expiryDate,
  idStatus = 'active',
  siaNumber,
  template = DEFAULT_ID_CARD_TEMPLATE,
  organizationName,
  organizationLogoUrl,
}: Props) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify/${qrToken}`
  const normalizedStatus = idStatus?.toLowerCase()
  const isLandscape = template.orientation === 'landscape'
  const isCompact = template.layout === 'compact'
  const isBold = template.layout === 'bold'
  const cleanSiaNumber = siaNumber?.trim()

  const statusClasses =
    normalizedStatus === 'revoked'
      ? 'bg-red-600 text-white'
      : normalizedStatus === 'suspended'
        ? 'bg-yellow-500 text-white'
        : normalizedStatus === 'expired'
          ? 'bg-orange-500 text-white'
          : normalizedStatus === 'inactive'
            ? 'bg-slate-500 text-white'
            : 'bg-emerald-600 text-white'

  return (
    <article
      className={`max-w-full overflow-hidden border border-slate-300 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)] ${
        isBold ? 'rounded-xl border-t-[6px]' : 'rounded-[26px]'
      } ${isLandscape ? 'w-[540px]' : 'w-[360px]'}`}
      style={isBold ? { borderTopColor: template.accentColor } : undefined}
    >
      <header
        className={isCompact ? 'px-5 py-4 text-white' : 'px-6 py-5 text-white'}
        style={{ backgroundColor: template.primaryColor }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`${isCompact ? 'text-xs' : 'text-sm'} truncate font-black leading-none`}>
              {template.headerText}
            </p>
            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {organizationName || 'Verified identity'}
            </p>
          </div>
          {template.showLogo ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-slate-900">
              {organizationLogoUrl ? (
                <Image
                  src={organizationLogoUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <ShieldCheck className="h-5 w-5" style={{ color: template.primaryColor }} />
              )}
            </div>
          ) : null}
        </div>
      </header>

      <div className={`px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide ${statusClasses}`}>
        {normalizedStatus || 'active'}
      </div>

      <div className={`${isCompact ? 'p-4' : 'p-6'} ${isLandscape ? 'grid grid-cols-[132px_minmax(0,1fr)] gap-5' : ''}`}>
        <div className="flex flex-col items-center text-center">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={fullName}
              width={96}
              height={96}
              unoptimized
              className={`${isCompact ? 'h-20 w-20' : 'h-24 w-24'} rounded-full border-4 border-slate-100 object-cover`}
            />
          ) : (
            <div className={`${isCompact ? 'h-20 w-20' : 'h-24 w-24'} flex items-center justify-center rounded-full bg-slate-200 text-sm text-slate-600`}>
              No Photo
            </div>
          )}
          <h3 className={`${isCompact ? 'mt-3 text-xl' : 'mt-4 text-2xl'} font-bold text-slate-900`}>
            {fullName}
          </h3>
          <p
            className="mt-1 text-xs font-bold uppercase tracking-[0.13em]"
            style={{ color: template.accentColor }}
          >
            {roleTitle}
          </p>
        </div>

        <div className={`${isLandscape ? 'mt-0' : isCompact ? 'mt-4' : 'mt-6'} space-y-2 text-sm`}>
          <DetailRow label="Employee Code" value={employeeCode || '—'} />
          <DetailRow label="ID Number" value={idNumber || '—'} />
          {template.showSia && cleanSiaNumber ? <DetailRow label="SIA Number" value={cleanSiaNumber} /> : null}
          {template.showIssueDate ? <DetailRow label="Issue Date" value={issueDate || '—'} /> : null}
          {template.showExpiryDate ? <DetailRow label="Expiry Date" value={expiryDate || '—'} /> : null}
        </div>

        {template.showQr ? (
          <div className={`${isLandscape ? 'col-span-2 mt-0' : 'mt-5'} flex flex-col items-center`}>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <QRCodeCanvas value={verifyUrl} size={isCompact ? 112 : 132} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Scan to verify</p>
          </div>
        ) : null}
      </div>

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center">
        <p className="text-xs font-semibold" style={{ color: template.primaryColor }}>
          {template.footerText}
        </p>
      </footer>
    </article>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="shrink-0 font-semibold text-slate-700">{label}</span>
      <span className="truncate text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}
