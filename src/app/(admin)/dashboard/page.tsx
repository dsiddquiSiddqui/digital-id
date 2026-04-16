'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  Shield,
  IdCard,
  Bell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const supabase = createClient()

  const [stats, setStats] = useState({
    users: 0,
    staff: 0,
    ids: 0,
    alerts: 0,
  })

  useEffect(() => {
    const load = async () => {
      const [u, s, i, a] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('staff').select('*', { count: 'exact', head: true }),
        supabase.from('staff_ids').select('*', { count: 'exact', head: true }),
        supabase.from('security_events').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        users: u.count || 0,
        staff: s.count || 0,
        ids: i.count || 0,
        alerts: a.count || 0,
      })
    }

    load()
  }, [supabase])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="mt-1 text-slate-500">
          Manage your staff operations in one place
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card title="Users" value={stats.users} icon={<Users />} />
        <Card title="Staff" value={stats.staff} icon={<Shield />} highlight />
        <Card title="Digital IDs" value={stats.ids} icon={<IdCard />} />
        <Card title="Alerts" value={stats.alerts} icon={<Bell />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-lg font-semibold">Staff Overview</h3>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <Mini label="Active Staff" value={stats.staff} />
              <Mini label="IDs" value={stats.ids} />
              <Mini label="Alerts" value={stats.alerts} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Panel title="Staff" desc="Manage all staff" href="/staff" />
            <Panel title="Users" desc="Manage users" href="/users" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h3 className="font-semibold">Quick Actions</h3>

            <div className="mt-4 space-y-3">
              <Action href="/staff/new" label="Create Staff" />
              <Action href="/alerts" label="View Alerts" />
              <Action href="/audit-logs" label="Audit Logs" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#081a33] p-6 text-white">
            <h3 className="text-lg font-semibold">Digital Identity</h3>
            <p className="mt-2 text-sm opacity-70">
              Verified IDs across system
            </p>

            <h2 className="mt-4 text-4xl font-bold">{stats.ids}</h2>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ title, value, icon, highlight = false }: any) {
  return (
    <div
      className={`rounded-2xl p-5 shadow ${
        highlight ? 'bg-[#0094e0] text-white' : 'bg-white'
      }`}
    >
      <div className="flex justify-between">
        <p className="text-sm">{title}</p>
        {icon}
      </div>
      <h2 className="mt-4 text-3xl font-bold">{value}</h2>
    </div>
  )
}

function Mini({ label, value }: any) {
  return (
    <div className="rounded-xl bg-slate-100 p-4 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <h3 className="text-xl font-bold">{value}</h3>
    </div>
  )
}

function Panel({ title, desc, href }: any) {
  return (
    <a href={href} className="block rounded-2xl bg-white p-5 shadow hover:shadow-md">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </a>
  )
}

function Action({ href, label }: any) {
  return (
    <a href={href} className="block rounded-xl bg-slate-100 p-3 text-sm hover:bg-slate-200">
      {label}
    </a>
  )
}