'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, UserPlus, ChevronLeft } from 'lucide-react'

export default function V2NewStaffPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fullName, setFullName] = useState('')
  const [parimStaffId, setParimStaffId] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [companyName, setCompanyName] = useState('H&D Security')
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
  const [photo, setPhoto] = useState<File | null>(null)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!fullName.trim() || !employeeCode.trim()) {
      setError('Full name and employee code are required.')
      setLoading(false)
      return
    }

    let photoUrl: string | null = null

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
          setLoading(false)
          return
        }

        photoUrl = uploadData.url
      }

      const response = await fetch('/api/v2/staff/create', {
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
          photo_url: photoUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create staff member.')
        setLoading(false)
        return
      }

      setSuccess('Staff member created successfully.')

      setTimeout(() => {
        router.push(`/v2/staff/${result.staff_id}`)
      }, 700)
    } catch {
      setError('Something went wrong while creating the staff member.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <UserPlus className="h-6 w-6 text-slate-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Create Staff
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Add a new staff member using the new V2 staff schema.
              </p>
            </div>
          </div>

          <Link
            href="/v2/staff"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Staff
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
              placeholder="British"
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
              placeholder="United Kingdom"
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
              placeholder="Male / Female / Other"
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
              <p className="text-xs text-slate-500">Does this staff member have access to a car?</p>
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
                Driver licence details such as licence number, expiry date, and uploaded file
                should be added later in the <strong>Documents</strong> section as a
                <strong> Driving Licence</strong> document.
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 pt-2">
            <h2 className="text-lg font-semibold text-slate-900">Photo & Notes</h2>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Profile Photo
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              <span>{photo ? photo.name : 'Upload staff photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
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
              disabled={loading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Creating staff...' : 'Create Staff'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}