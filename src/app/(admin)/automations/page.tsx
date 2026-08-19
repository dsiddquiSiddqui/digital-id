'use client'

import { useEffect, useState } from 'react'
import { GitBranch, Play, Save } from 'lucide-react'

type Rule = {
  id: string
  name: string
  trigger_type: string
  is_active: boolean
  conditions: { days_before?: number }
  actions: Array<{ type: string; target: string; message: string }>
  last_run_at: string | null
  last_tested_at?: string | null
}

type Run = { id: string; status: string; matched_count: number; action_count: number; created_at: string }
type Template = { key: string; name: string; trigger_type: string; conditions: { days_before?: number }; actions: Array<{ type: string; target: string; message: string }> }

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [form, setForm] = useState({
    name: '',
    trigger_type: 'document_expiring',
    days_before: 14,
    action_type: 'create_notification',
    message: 'Documents need attention.',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/automations')
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to load automations.')
    else {
      setRules(result.rules || [])
      setRuns(result.runs || [])
      setTemplates(result.templates || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        trigger_type: form.trigger_type,
        conditions: { days_before: form.days_before },
        actions: [{ type: form.action_type, target: 'admins', message: form.message }],
      }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to create automation.')
    else {
      setMessage('Automation rule created.')
      setForm((prev) => ({ ...prev, name: '' }))
      await load()
    }
    setSaving(false)
  }

  const toggle = async (rule: Rule) => {
    await fetch('/api/admin/automations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    })
    await load()
  }

  const applyTemplate = (template: Template) => {
    setForm({
      name: template.name,
      trigger_type: template.trigger_type,
      days_before: template.conditions?.days_before || 0,
      action_type: template.actions?.[0]?.type || 'create_notification',
      message: template.actions?.[0]?.message || '',
    })
  }

  const testRule = async (rule: Rule) => {
    setTestingId(rule.id)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', id: rule.id }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Test run failed.')
    else {
      setMessage(`Test completed. ${result.matched_count} record(s) would match.`)
      await load()
    }
    setTestingId('')
  }

  if (loading) return <Panel>Loading automations...</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><GitBranch className="h-5 w-5" /></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Workflow Automations</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Create simple rules that monitor operational events and notify your team.</p>
          </div>
        </div>
      </section>

      <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">New rule</h2>
        {templates.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {templates.map((template) => (
              <button key={template.key} type="button" onClick={() => applyTemplate(template)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-slate-950 hover:text-slate-950">
                {template.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Rule name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Document expires in 14 days" />
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Trigger</span><select value={form.trigger_type} onChange={(event) => setForm((prev) => ({ ...prev, trigger_type: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"><option value="document_expiring">Document expiring</option><option value="id_expired">ID expired</option><option value="invite_pending">Invite pending</option></select></label>
          <Field label="Days before" type="number" value={String(form.days_before)} onChange={(value) => setForm((prev) => ({ ...prev, days_before: Number(value) }))} placeholder="14" />
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Action</span><select value={form.action_type} onChange={(event) => setForm((prev) => ({ ...prev, action_type: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"><option value="create_notification">Create notification</option><option value="send_email">Send email</option><option value="create_task">Create task</option></select></label>
          <div className="md:col-span-2"><Field label="Message" value={form.message} onChange={(value) => setForm((prev) => ({ ...prev, message: value }))} placeholder="Documents need attention." /></div>
        </div>
        <button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Create rule'}
        </button>
      </form>

      {error ? <Panel tone="danger">{error}</Panel> : null}
      {message ? <Panel tone="success">{message}</Panel> : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Rules</h2>
          <div className="mt-4 space-y-3">
            {rules.length === 0 ? <p className="text-sm text-slate-500">No rules yet.</p> : rules.map((rule) => (
              <div key={rule.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black text-slate-950">{rule.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{rule.trigger_type} - {rule.actions?.length || 0} action(s)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => testRule(rule)} disabled={testingId === rule.id} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-60">
                    {testingId === rule.id ? 'Testing...' : 'Test'}
                  </button>
                  <button onClick={() => toggle(rule)} className={`rounded-full px-4 py-2 text-xs font-black ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {rule.is_active ? 'Active' : 'Paused'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><Play className="h-4 w-4 text-slate-500" /><h2 className="text-lg font-black text-slate-950">Recent runs</h2></div>
          <div className="mt-4 space-y-3">
            {runs.length === 0 ? <p className="text-sm text-slate-500">No runs yet.</p> : runs.map((run) => (
              <div key={run.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <p className="font-black text-slate-950">{run.status}</p>
                <p className="mt-1 text-slate-500">{run.matched_count} matched, {run.action_count} actions</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" /></label>
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>{children}</div>
}
