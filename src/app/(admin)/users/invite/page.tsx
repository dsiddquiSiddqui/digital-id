'use client'

import { useEffect, useState } from 'react'
import { Link as LinkIcon, MailPlus, Send } from 'lucide-react'

const ROLES = ['admin', 'manager', 'hr_manager', 'hr', 'operation_manager', 'operation_team', 'guard', 'staff']

type Invitation = {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  created_at: string
}

export default function InviteUserPage() {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'manager' })
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteUrl, setInviteUrl] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const response = await fetch('/api/admin/invite-user')
    const result = await response.json()
    if (response.ok) setInvitations(result.invitations || [])
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    setInviteUrl('')

    const response = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Unable to create invitation.')
    } else {
      const absoluteUrl = `${window.location.origin}${result.invite_url}`
      setInviteUrl(absoluteUrl)
      setMessage(result.note || 'Invitation created.')
      setForm({ full_name: '', email: '', role: 'manager' })
      await load()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <MailPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Invite User</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create a role-based invitation link. Email sending can be connected later with Resend, SendGrid, or Supabase email templates.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Full name" value={form.full_name} onChange={(value) => setForm((prev) => ({ ...prev, full_name: value }))} placeholder="Jane Smith" />
          <Field label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="jane@example.com" type="email" required />
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Role</span>
            <select value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-slate-950">
              {ROLES.map((role) => <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
        </div>
        <button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
          <Send className="h-4 w-4" />
          {saving ? 'Creating...' : 'Create invitation'}
        </button>
      </form>

      {error ? <Panel tone="danger">{error}</Panel> : null}
      {message ? <Panel tone="success">{message}</Panel> : null}
      {inviteUrl ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <LinkIcon className="h-5 w-5 text-slate-500" />
            <h2 className="font-black text-slate-950">Invitation link</h2>
          </div>
          <p className="mt-3 break-all rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">{inviteUrl}</p>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Recent invitations</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {invitations.length === 0 ? <p className="py-4 text-sm text-slate-500">No invitations yet.</p> : invitations.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold text-slate-950">{invite.full_name || invite.email}</p>
                <p className="text-sm text-slate-500">{invite.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600">{invite.status} - {invite.role.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
    </label>
  )
}

function Panel({ children, tone }: { children: React.ReactNode; tone: 'danger' | 'success' }) {
  return <div className={`rounded-3xl border p-4 text-sm font-semibold ${tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{children}</div>
}
