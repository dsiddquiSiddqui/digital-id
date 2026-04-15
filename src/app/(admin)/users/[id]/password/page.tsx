'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [userName, setUserName] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const checkAccessAndLoadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      // 🔒 ROLE PROTECTION
      if (!currentProfile || !['admin', 'super_admin'].includes(currentProfile.role)) {
        router.push('/dashboard')
        return
      }

      // Load target user
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', id)
        .single()

      if (targetUser) {
        setUserName(targetUser.full_name)
      }

      setLoading(false)
    }

    if (id) checkAccessAndLoadUser()
  }, [id, supabase, router])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!password || !confirmPassword) {
      setError('Please fill all fields.')
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

    try {
      const res = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: id,
          password,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Failed to reset password.')
        setSaving(false)
        return
      }

      setSuccess('Password updated successfully.')

      setTimeout(() => {
        router.push('/users')
      }, 800)
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Reset Password
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Change password for <strong>{userName}</strong>
            </p>
          </div>

          <Link
            href="/users"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
          >
            Back
          </Link>
        </div>
      </section>

      {/* FORM */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleReset} className="space-y-4 max-w-xl">
          <div>
            <label className="text-sm text-slate-700">New Password</label>
            <input
              type="password"
              className="w-full mt-2 border rounded-xl px-4 py-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-700">Confirm Password</label>
            <input
              type="password"
              className="w-full mt-2 border rounded-xl px-4 py-3"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-slate-900 text-white px-5 py-3 rounded-xl"
          >
            {saving ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      </section>
    </div>
  )
}