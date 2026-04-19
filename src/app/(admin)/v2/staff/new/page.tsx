'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload,
  UserPlus,
  ChevronLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
} from 'lucide-react'

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [createLogin, setCreateLogin] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    resetMessages()

    if (!fullName.trim() || !employeeCode.trim()) {
      setError('Full name and employee code are required.')
      setLoading(false)
      return
    }

    if (createLogin) {
      if (!email.trim()) {
        setError('Email is required when creating a login account.')
        setLoading(false)
        return
      }

      if (!password.trim()) {
        setError('Temporary password is required when creating a login account.')
        setLoading(false)
        return
      }

      if (password.trim().length < 8) {
        setError('Password must be at least 8 characters long.')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('Password and confirm password do not match.')
        setLoading(false)
        return
      }
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
          password: createLogin ? password.trim() : null,
          create_login: createLogin,
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

      setSuccess(
        createLogin
          ? 'Staff member and login account created successfully.'
          : 'Staff member created successfully.'
      )

      setTimeout(() => {
        router.push(`/v2/staff/${result.staff_id}`)
      }, 700)
    } catch {
      setError('Something went wrong while creating the staff member.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setPhoto(selectedFile)
  }

  const clearPhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
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
              Email {createLogin ? '*' : ''}
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
            <h2 className="text-lg font-semibold text-slate-900">Staff Login Account</h2>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-300 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2">
                  <ShieldCheck className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Create login account
                  </p>
                  <p className="text-xs text-slate-500">
                    Enable this if the staff member should be able to log in to the staff portal.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
                className="h-5 w-5"
              />
            </div>
          </div>

          {createLogin ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Temporary Password *
                </label>
                <div className="flex items-center rounded-2xl border border-slate-300 px-4">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-3 outline-none"
                    placeholder="TempPass123!"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password *
                </label>
                <div className="flex items-center rounded-2xl border border-slate-300 px-4">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full py-3 outline-none"
                    placeholder="TempPass123!"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                A staff portal login will be created using the email and temporary password above.
              </div>
            </>
          ) : (
            <div className="lg:col-span-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Login account creation is disabled. This will create only the staff record.
            </div>
          )}

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
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>

            {photoPreview ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Image Preview</p>
                    <p className="text-xs text-slate-500">
                      This lets you confirm the correct image was selected before saving.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                <div className="relative h-56 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image
                    src={photoPreview}
                    alt="Selected profile preview"
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
              disabled={loading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading
                ? createLogin
                  ? 'Creating staff and login...'
                  : 'Creating staff...'
                : createLogin
                ? 'Create Staff & Login'
                : 'Create Staff'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}