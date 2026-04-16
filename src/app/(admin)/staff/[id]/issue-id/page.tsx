'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function generateQrToken() {
  return crypto.randomUUID()
}

export default function IssueIdPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const today = new Date().toISOString().split('T')[0]

  const [idNumber, setIdNumber] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [siteName, setSiteName] = useState('')
  const [siaNumber, setSiaNumber] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [expiryDate, setExpiryDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (expiryDate <= issueDate) {
      setError('Expiry date must be later than issue date.')
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      setError('Admin profile not found.')
      setLoading(false)
      return
    }

    const { error: updateOldIdsError } = await supabase
      .from('staff_ids')
      .update({ is_current: false, status: 'revoked' })
      .eq('staff_id', id)
      .eq('is_current', true)

    if (updateOldIdsError) {
      setError(updateOldIdsError.message)
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('staff_ids').insert([
      {
        staff_id: id,
        id_number: idNumber,
        issue_date: issueDate,
        expiry_date: expiryDate,
        site_name: siteName || null,
        role_title: roleTitle,
        sia_number: siaNumber || null,
        qr_token: generateQrToken(),
        watermark_text: 'Internal Digital ID',
        is_current: true,
        status: 'active',
        created_by: profile.id,
      },
    ])

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push(`/staff/${id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Issue Digital ID
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a new digital ID for this staff member. Previous IDs will automatically be marked as non-current.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleIssue} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ID Number
            </label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="ID-1001"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Role Title
            </label>
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Door Supervisor"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Site Name
            </label>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Canary Wharf"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              SIA Number
            </label>
            <input
              value={siaNumber}
              onChange={(e) => setSiaNumber(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="SIA-874221"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Issue Date
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              required
            />
          </div>

          {error ? (
            <div className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Issuing ID...' : 'Issue Digital ID'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}