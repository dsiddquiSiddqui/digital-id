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
    guards: 0,
    ids: 0,
    alerts: 0,
  })

  useEffect(() => {
    const load = async () => {
      const [u, g, i, a] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('guards').select('*', { count: 'exact', head: true }),
        supabase.from('guard_ids').select('*', { count: 'exact', head: true }),
        supabase.from('security_events').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        users: u.count || 0,
        guards: g.count || 0,
        ids: i.count || 0,
        alerts: a.count || 0,
      })
    }

    load()
  }, [])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-slate-500 mt-1">
          Manage your security operations in one place
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Users" value={stats.users} icon={<Users />} />
        <Card title="Guards" value={stats.guards} icon={<Shield />} highlight />
        <Card title="Digital IDs" value={stats.ids} icon={<IdCard />} />
        <Card title="Alerts" value={stats.alerts} icon={<Bell />} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="font-semibold text-lg">Security Overview</h3>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <Mini label="Active Guards" value={stats.guards} />
              <Mini label="IDs" value={stats.ids} />
              <Mini label="Alerts" value={stats.alerts} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Panel title="Guards" desc="Manage all guards" href="/guards" />
            <Panel title="Users" desc="Manage users" href="/users" />
          </div>
        </div>

        {/* Right */}
        <div className="space-y-6">

          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="font-semibold">Quick Actions</h3>

            <div className="mt-4 space-y-3">
              <Action href="/guards/new" label="Create Guard" />
              <Action href="/alerts" label="View Alerts" />
              <Action href="/audit-logs" label="Audit Logs" />
            </div>
          </div>

          <div className="bg-[#081a33] text-white p-6 rounded-2xl">
            <h3 className="font-semibold text-lg">Digital Identity</h3>
            <p className="text-sm mt-2 opacity-70">
              Verified IDs across system
            </p>

            <h2 className="text-4xl mt-4 font-bold">{stats.ids}</h2>
          </div>

        </div>
      </div>
    </div>
  )
}

/* Components */

function Card({ title, value, icon, highlight = false }: any) {
  return (
    <div className={`p-5 rounded-2xl shadow ${
      highlight ? 'bg-[#0094e0] text-white' : 'bg-white'
    }`}>
      <div className="flex justify-between">
        <p className="text-sm">{title}</p>
        {icon}
      </div>
      <h2 className="text-3xl mt-4 font-bold">{value}</h2>
    </div>
  )
}

function Mini({ label, value }: any) {
  return (
    <div className="bg-slate-100 p-4 rounded-xl text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <h3 className="text-xl font-bold">{value}</h3>
    </div>
  )
}

function Panel({ title, desc, href }: any) {
  return (
    <a href={href} className="bg-white p-5 rounded-2xl shadow block hover:shadow-md">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </a>
  )
}

function Action({ href, label }: any) {
  return (
    <a href={href} className="block bg-slate-100 p-3 rounded-xl text-sm hover:bg-slate-200">
      {label}
    </a>
  )
}