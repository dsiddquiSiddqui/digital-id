'use client'

import { useEffect, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'

const ROLES = ['admin', 'manager', 'hr_manager', 'hr', 'operation_manager', 'operation_team', 'guard', 'staff']
const PERMISSIONS = [
  ['view_staff', 'View staff'],
  ['edit_staff', 'Edit staff'],
  ['manage_documents', 'Manage documents'],
  ['approve_documents', 'Approve documents'],
  ['view_reports', 'View reports'],
  ['manage_users', 'Manage users'],
  ['view_audit', 'View audit logs'],
  ['manage_imports', 'Manage imports'],
  ['manage_settings', 'Manage settings'],
] as const

type Matrix = Record<string, Record<string, boolean>>

function defaultMatrix(): Matrix {
  return Object.fromEntries(
    ROLES.map((role) => [
      role,
      Object.fromEntries(PERMISSIONS.map(([key]) => [key, role === 'admin'])),
    ])
  )
}

export default function PermissionMatrixPage() {
  const [matrix, setMatrix] = useState<Matrix>(defaultMatrix)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/role-permissions')
      const result = await response.json()
      if (response.ok && Object.keys(result.role_permissions || {}).length > 0) {
        setMatrix({ ...defaultMatrix(), ...result.role_permissions })
      } else if (!response.ok) {
        setError(result.error || 'Unable to load permissions.')
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggle = (role: string, permission: string) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role]?.[permission],
      },
    }))
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    const response = await fetch('/api/admin/role-permissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_permissions: matrix }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to save permissions.')
    else setMessage('Permission matrix saved.')
    setSaving(false)
  }

  if (loading) return <Panel>Loading permissions...</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Role Permissions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure the role policy matrix. Enforcement can be expanded route-by-route using this saved organization policy.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Role</th>
              {PERMISSIONS.map(([, label]) => <th key={label} className="px-5 py-4">{label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ROLES.map((role) => (
              <tr key={role}>
                <td className="px-5 py-4 font-black capitalize text-slate-950">{role.replace(/_/g, ' ')}</td>
                {PERMISSIONS.map(([key]) => (
                  <td key={key} className="px-5 py-4">
                    <input type="checkbox" checked={Boolean(matrix[role]?.[key])} onChange={() => toggle(role, key)} className="h-5 w-5 rounded border-slate-300" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {error ? <Panel tone="danger">{error}</Panel> : null}
      {message ? <Panel tone="success">{message}</Panel> : null}
      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save permissions'}
      </button>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>{children}</div>
}
