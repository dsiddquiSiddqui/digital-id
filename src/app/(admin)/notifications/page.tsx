'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle2, CircleAlert, Info, TriangleAlert } from 'lucide-react'

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  severity: 'info' | 'success' | 'warning' | 'critical'
  action_url: string | null
  read_at: string | null
  created_at: string
}

const icons = {
  info: <Info className="h-5 w-5" />,
  success: <CheckCircle2 className="h-5 w-5" />,
  warning: <TriangleAlert className="h-5 w-5" />,
  critical: <CircleAlert className="h-5 w-5" />,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/notifications')
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to load notifications.')
    else setNotifications(result.notifications || [])
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const markRead = async (id: string) => {
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    await load()
  }

  const markAllRead = async () => {
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    })
    await load()
  }

  const unread = notifications.filter((item) => !item.read_at).length
  const grouped = useMemo(() => {
    return notifications.reduce<Record<string, NotificationRow[]>>((acc, item) => {
      const key = item.severity === 'critical' ? 'Critical' : item.type.replace(/_/g, ' ')
      acc[key] = acc[key] || []
      acc[key].push(item)
      return acc
    }, {})
  }, [notifications])

  if (loading) return <Panel>Loading notifications...</Panel>
  if (error) return <Panel tone="danger">{error}</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Notifications</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {unread} unread alert{unread === 1 ? '' : 's'} from documents, imports, billing, and security events.
            </p>
          </div>
        </div>
        {unread > 0 ? (
          <button onClick={markAllRead} className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">
            Mark all read
          </button>
        ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {notifications.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {group} - {items.length}
                </div>
            {items.map((item) => (
              <div key={item.id} className={`p-5 ${item.read_at ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <span className={`rounded-2xl p-3 ${
                      item.severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : item.severity === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : item.severity === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {icons[item.severity] || icons.info}
                    </span>
                    <div>
                      <p className="font-black text-slate-950">{item.title}</p>
                      {item.body ? <p className="mt-1 text-sm leading-6 text-slate-500">{item.body}</p> : null}
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.action_url ? (
                      <Link href={item.action_url} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                        Open
                      </Link>
                    ) : null}
                    {!item.read_at ? (
                      <button onClick={() => markRead(item.id)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>{children}</div>
}
