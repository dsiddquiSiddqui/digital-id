'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import IdCard from '@/components/IdCard'

export default function MyIdPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [guard, setGuard] = useState<any>(null)
  const [guardId, setGuardId] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/guard-login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile || profile.role !== 'guard') {
        router.push('/')
        return
      }

      const { data: guardData } = await supabase
        .from('guards')
        .select('*')
        .eq('profile_id', profile.id)
        .single()

      const { data: idData } = await supabase
        .from('guard_ids')
        .select('*')
        .eq('guard_id', guardData.id)
        .eq('is_current', true)
        .single()

      setGuard(guardData)
      setGuardId(idData)
      setLoading(false)
    }

    load()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/guard-login')
  }

  if (loading) return <p className="p-6">Loading your ID...</p>

  if (!guardId) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">My Digital ID</h1>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-500 px-4 py-2 text-white"
            >
              Logout
            </button>
          </div>
          <p>No ID assigned.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex max-w-xl flex-col items-center">
        <div className="mb-4 flex w-full justify-end">
          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-500 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>

        <IdCard
          fullName={guard.full_name}
          employeeCode={guard.employee_code}
          roleTitle={guardId.role_title}
          idNumber={guardId.id_number}
          qrToken={guardId.qr_token}
          photoUrl={guard.photo_url}
          issueDate={guardId.issue_date}
          expiryDate={guardId.expiry_date}
          idStatus={guardId.status}
        />

        
      </div>
    </main>
  )
}