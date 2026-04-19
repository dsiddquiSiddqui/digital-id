'use client'

import Image from 'next/image'
import { QRCodeCanvas } from 'qrcode.react'
import logo from '@/assets/SGC-Security-Tag-White-Inverse-Logo.svg'

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
}: Props) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify/${qrToken}`

  const normalizedStatus = idStatus?.toLowerCase()

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

  const cleanSiaNumber = siaNumber?.trim()

  return (
    <div className="w-[360px] overflow-hidden rounded-[26px] border border-slate-300 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
      {/* Header */}
      <div className="bg-[#081a33] px-6 py-5 text-white">
        <div className="flex items-center justify-center">
          <Image
            src={logo}
            alt="SGC Security Logo"
            className="h-auto w-[180px] object-contain"
            priority
          />
        </div>
      </div>

      {/* Status strip */}
      <div className={`px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide ${statusClasses}`}>
        {normalizedStatus || 'active'}
      </div>

      {/* Body */}
      <div className="px-6 py-6">
        <div className="flex flex-col items-center text-center">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={fullName}
              className="h-24 w-24 rounded-full border-4 border-slate-100 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-600">
              No Photo
            </div>
          )}

          <h3 className="mt-4 text-2xl font-bold text-slate-900">{fullName}</h3>
          <p className="mt-1 text-sm font-medium uppercase tracking-wide text-slate-500">
            {roleTitle}
          </p>
        </div>

        <div className="mt-6 space-y-3 text-sm">
          <DetailRow label="Employee Code" value={employeeCode || '—'} />
          <DetailRow label="ID Number" value={idNumber || '—'} />

          {cleanSiaNumber ? (
            <DetailRow label="SIA Number" value={cleanSiaNumber} />
          ) : null}

          <DetailRow label="Issue Date" value={issueDate || '—'} />
          <DetailRow label="Expiry Date" value={expiryDate || '—'} />
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <QRCodeCanvas value={verifyUrl} size={140} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Scan to verify</p>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center">
        <p className="text-xs font-semibold text-[#081a33]">
          Verified Digital Identity
        </p>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  )
}