'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Save, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

type Profile = {
  id: string
  auth_user_id: string
  role: string
  full_name: string
  email: string
  phone?: string | null
  is_active?: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError || !profileData) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      if (!['super_admin', 'admin'].includes(profileData.role)) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      setProfile(profileData)
      setLoading(false)
    }

    loadProfile()
  }, [router, supabase])

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setMessage('Password updated successfully.')
    setPassword('')
    setConfirmPassword('')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-slate-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <User className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Profile Details</h2>
            <p className="text-sm text-slate-500">Your current account information</p>
          </div>
        </div>

        <div className="space-y-4">
          <InfoBox label="Full Name" value={profile?.full_name || '-'} />
          <InfoBox label="Email" value={profile?.email || '-'} />
          <InfoBox label="Phone" value={profile?.phone || '-'} />
          <InfoBox label="Role" value={profile?.role || '-'} />
          <InfoBox
            label="Account Status"
            value={profile?.is_active ? 'Active' : 'Inactive'}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <KeyRound className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Change Password</h2>
            <p className="text-sm text-slate-500">Update your login password securely</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}