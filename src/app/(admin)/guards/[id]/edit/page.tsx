'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Guard = {
  id: string
  full_name: string
  employee_code: string
  company_name: string
  phone: string | null
  email: string | null
  status: string
  photo_url?: string | null
}

export default function EditGuardPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [guard, setGuard] = useState<Guard | null>(null)

  const [fullName, setFullName] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('active')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  useEffect(() => {
    const loadGuard = async () => {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('guards')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Guard not found.')
        setLoading(false)
        return
      }

      const row = data as Guard
      setGuard(row)
      setFullName(row.full_name || '')
      setEmployeeCode(row.employee_code || '')
      setCompanyName(row.company_name || '')
      setPhone(row.phone || '')
      setEmail(row.email || '')
      setStatus(row.status || 'active')
      setPhotoUrl(row.photo_url || '')
      setLoading(false)
    }

    if (id) loadGuard()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    if (!fullName.trim() || !employeeCode.trim() || !companyName.trim() || !email.trim()) {
      setError('Please fill in all required fields.')
      setSaving(false)
      return
    }

    let finalPhotoUrl = photoUrl || null

    try {
      if (photo) {
        const fileName = `${Date.now()}-${photo.name}`

        const uploadRes = await fetch('/api/admin/upload-photo', {
          method: 'POST',
          body: photo,
          headers: {
            'x-filename': fileName,
          },
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          setError(uploadData.error || 'Failed to upload photo.')
          setSaving(false)
          return
        }

        finalPhotoUrl = uploadData.url
      }

      const response = await fetch('/api/admin/update-guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_id: id,
          full_name: fullName.trim(),
          employee_code: employeeCode.trim(),
          company_name: companyName.trim(),
          phone: phone.trim() || null,
          email: email.trim().toLowerCase(),
          status,
          photo_url: finalPhotoUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update guard.')
        setSaving(false)
        return
      }

      setSuccess('Guard updated successfully.')

      setTimeout(() => {
        router.push(`/guards/${id}`)
        router.refresh()
      }, 700)
    } catch {
      setError('Something went wrong while updating the guard.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-slate-600">Loading guard...</p>
      </div>
    )
  }

  if (!guard) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <p className="text-sm text-slate-600">Guard not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Guard
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update guard details and profile information.
            </p>
          </div>

          <Link
            href={`/guards/${id}`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Guard
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Employee Code
            </label>
            <input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Employee code"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Company Name
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Company name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Email"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
              <option value="revoked">revoked</option>
              <option value="expired">expired</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Current Photo
            </label>

            <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-slate-500">
                  {fullName?.charAt(0) || 'G'}
                </span>
              )}
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              <span>{photo ? photo.name : 'Upload new photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {error ? (
            <div className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Guard'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}