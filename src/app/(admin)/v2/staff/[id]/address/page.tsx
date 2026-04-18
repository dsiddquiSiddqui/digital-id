'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin } from 'lucide-react'

type StaffSummary = {
  id: string
  full_name: string
  employee_code: string
}

type AddressRecord = {
  id: string
  staff_id: string
  street_address: string | null
  city: string | null
  post_code: string | null
  country: string | null
  is_current: boolean
}

export default function V2StaffAddressPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recordId, setRecordId] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffSummary | null>(null)

  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState('')
  const [postCode, setPostCode] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [staffRes, addressRes] = await Promise.all([
          fetch(`/api/v2/staff/${id}`),
          fetch(`/api/v2/staff/${id}/address`),
        ])

        const staffJson = await staffRes.json()
        const addressJson = await addressRes.json()

        if (!staffRes.ok) {
          setError(staffJson.error || 'Failed to load staff member.')
          setLoading(false)
          return
        }

        setStaff(staffJson.staff)

        if (addressRes.ok && addressJson.address) {
          const row: AddressRecord = addressJson.address
          setRecordId(row.id)
          setStreetAddress(row.street_address || '')
          setCity(row.city || '')
          setPostCode(row.post_code || '')
          setCountry(row.country || '')
        }
      } catch {
        setError('Something went wrong while loading address.')
      } finally {
        setLoading(false)
      }
    }

    if (id) loadData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/v2/staff/${id}/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street_address: streetAddress.trim() || null,
          city: city.trim() || null,
          post_code: postCode.trim() || null,
          country: country.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save address.')
        setSaving(false)
        return
      }

      if (result.address?.id) {
        setRecordId(result.address.id)
      }

      setSuccess(recordId ? 'Address updated successfully.' : 'Address created successfully.')
    } catch {
      setError('Something went wrong while saving address.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading address...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <MapPin className="h-6 w-6 text-slate-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Address
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {staff ? `${staff.full_name} (${staff.employee_code})` : 'Manage address'}
              </p>
            </div>
          </div>

          <Link
            href={`/v2/staff/${id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Staff
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Current Address
            </h2>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Street Address
            </label>
            <input
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="123 Example Street"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              City
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="London"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Post Code
            </label>
            <input
              value={postCode}
              onChange={(e) => setPostCode(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="E14 5AB"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Country
            </label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="United Kingdom"
            />
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
              {saving ? 'Saving...' : recordId ? 'Update Address' : 'Create Address'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}