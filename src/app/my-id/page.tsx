'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import IdCard from '@/components/IdCard'

export default function MyIdPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<any>(null)
  const [staffId, setStaffId] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/staff-login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile || profile.role !== 'staff') {
        router.push('/')
        return
      }

      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('profile_id', profile.id)
        .single()

      if (!staffData) {
        setLoading(false)
        return
      }

      const { data: idData } = await supabase
        .from('staff_ids')
        .select('*')
        .eq('staff_id', staffData.id)
        .eq('is_current', true)
        .single()

      setStaff(staffData)
      setStaffId(idData)
      setLoading(false)
    }

    load()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/staff-login')
  }

  if (loading) return <p className="p-6">Loading your ID...</p>

  if (!staffId) {
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
          fullName={staff.full_name}
          employeeCode={staff.employee_code}
          roleTitle={staffId.role_title}
          idNumber={staffId.id_number}
          qrToken={staffId.qr_token}
          photoUrl={staff.photo_url}
          issueDate={staffId.issue_date}
          expiryDate={staffId.expiry_date}
          idStatus={staffId.status}
        />
      </div>
    </main>
  )
}