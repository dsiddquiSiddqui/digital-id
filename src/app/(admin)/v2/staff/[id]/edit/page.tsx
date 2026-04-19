'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, ChevronLeft, X } from 'lucide-react'

type Staff = {
  id: string
  full_name: string
  parim_staff_id: string | null
  employee_code: string
  company_name: string | null
  email: string | null
  phone: string | null
  second_phone: string | null
  staff_type: string
  status: string
  photo_url: string | null
  nationality: string | null
  country_of_birth: string | null
  gender: string | null
  date_of_birth: string | null
  access_to_car: boolean | null
  driver_licence: boolean | null
  notes: string | null
}

export default function V2EditStaffPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fullName, setFullName] = useState('')
  const [parimStaffId, setParimStaffId] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [secondPhone, setSecondPhone] = useState('')
  const [staffType, setStaffType] = useState('security')
  const [status, setStatus] = useState('active')
  const [nationality, setNationality] = useState('')
  const [countryOfBirth, setCountryOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [accessToCar, setAccessToCar] = useState(false)
  const [driverLicence, setDriverLicence] = useState(false)
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    const loadStaff = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/v2/staff/${id}`)
        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Failed to load staff member.')
          setLoading(false)
          return
        }

        const row = result.staff as Staff

        setFullName(row.full_name || '')
        setParimStaffId(row.parim_staff_id || '')
        setEmployeeCode(row.employee_code || '')
        setCompanyName(row.company_name || '')
        setEmail(row.email || '')
        setPhone(row.phone || '')
        setSecondPhone(row.second_phone || '')
        setStaffType(row.staff_type || 'security')
        setStatus(row.status || 'active')
        setNationality(row.nationality || '')
        setCountryOfBirth(row.country_of_birth || '')
        setGender(row.gender || '')
        setDateOfBirth(row.date_of_birth || '')
        setAccessToCar(!!row.access_to_car)
        setDriverLicence(!!row.driver_licence)
        setNotes(row.notes || '')
        setPhotoUrl(row.photo_url || '')
      } catch {
        setError('Something went wrong while loading the staff member.')
      } finally {
        setLoading(false)
      }
    }

    if (id) loadStaff()
  }, [id])

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return
    }

    const objectUrl = URL.createObjectURL(photo)
    setPhotoPreview(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [photo])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setPhoto(selectedFile)
  }

  const clearSelectedPhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (!fullName.trim() || !employeeCode.trim()) {
      setError('Full name and employee code are required.')
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

      const response = await fetch(`/api/v2/staff/${id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          parim_staff_id: parimStaffId.trim() || null,
          employee_code: employeeCode.trim(),
          company_name: companyName.trim() || null,
          email: email.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          second_phone: secondPhone.trim() || null,
          staff_type: staffType,
          status,
          nationality: nationality.trim() || null,
          country_of_birth: countryOfBirth.trim() || null,
          gender: gender.trim() || null,
          date_of_birth: dateOfBirth || null,
          access_to_car: accessToCar,
          driver_licence: driverLicence,
          notes: notes.trim() || null,
          photo_url: finalPhotoUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update staff member.')
        setSaving(false)
        return
      }

      setSuccess('Staff member updated successfully.')

      setTimeout(() => {
        router.push(`/v2/staff/${id}`)
      }, 700)
    } catch {
      setError('Something went wrong while updating the staff member.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading staff member...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Staff
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Update staff details using the new V2 schema.
            </p>
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
            <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full Name *
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Ali Raza"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              PARiM Staff ID
            </label>
            <input
              value={parimStaffId}
              onChange={(e) => setParimStaffId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="PARiM ID"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Employee Code *
            </label>
            <input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="HD-1001"
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
              placeholder="H&D Security"
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
              placeholder="staff@email.com"
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
              placeholder="+44 7700 900000"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Second Phone
            </label>
            <input
              value={secondPhone}
              onChange={(e) => setSecondPhone(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="+44 7700 900001"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Staff Type
            </label>
            <select
              value={staffType}
              onChange={(e) => setStaffType(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="security">security</option>
              <option value="warehouse">warehouse</option>
              <option value="event">event</option>
              <option value="admin">admin</option>
              <option value="contractor">contractor</option>
              <option value="other">other</option>
            </select>
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
              <option value="archived">archived</option>
            </select>
          </div>

          <div className="lg:col-span-2 pt-2">
            <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nationality
            </label>
            <input
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Country of Birth
            </label>
            <input
              value={countryOfBirth}
              onChange={(e) => setCountryOfBirth(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Gender
            </label>
            <input
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Date of Birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div className="lg:col-span-2 pt-2">
            <h2 className="text-lg font-semibold text-slate-900">Operational Details</h2>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-300 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Access to Car</p>
            </div>
            <input
              type="checkbox"
              checked={accessToCar}
              onChange={(e) => setAccessToCar(e.target.checked)}
              className="h-5 w-5"
            />
          </div>

          <div className="rounded-2xl border border-slate-300 px-4 py-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Driver Licence</p>
                <p className="text-xs text-slate-500">
                  Use this as a yes/no flag only.
                </p>
              </div>
              <input
                type="checkbox"
                checked={driverLicence}
                onChange={(e) => setDriverLicence(e.target.checked)}
                className="h-5 w-5"
              />
            </div>

            {driverLicence ? (
              <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Driver licence number, expiry date, and uploaded licence file should be
                managed in the <strong>Documents</strong> section as a
                <strong> Driving Licence</strong> document.
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 pt-2">
            <h2 className="text-lg font-semibold text-slate-900">Photo & Notes</h2>
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
                  {fullName?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              )}
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              <span>{photo ? photo.name : 'Upload new photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>

            {photoPreview ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">New Photo Preview</p>
                    <p className="text-xs text-slate-500">
                      This is the image that will replace the current photo after saving.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedPhoto}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                <div className="relative h-56 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image
                    src={photoPreview}
                    alt="Selected new photo preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Optional notes..."
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
              {saving ? 'Saving...' : 'Update Staff'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}