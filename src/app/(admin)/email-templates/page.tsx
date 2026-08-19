'use client'

import { useEffect, useState } from 'react'
import { Mail, Save, Send } from 'lucide-react'
import { AdminEmptyState, AdminSkeleton, SavingLabel } from '@/components/admin/Polish'
import { useToast } from '@/components/admin/ToastProvider'
import { sanitizeEmailTemplateHtml } from '@/lib/email-template-html'

type EmailTemplate = {
  id?: string
  template_key: string
  name: string
  subject: string
  preview_text: string | null
  body_html: string
  body_text: string | null
  is_active: boolean
}

const BLANK_TEMPLATE: EmailTemplate = {
  template_key: '',
  name: '',
  subject: '',
  preview_text: '',
  body_html: '',
  body_text: '',
  is_active: true,
}

export default function EmailTemplatesPage() {
  const { notify } = useToast()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [starters, setStarters] = useState<EmailTemplate[]>([])
  const [selected, setSelected] = useState<EmailTemplate>(BLANK_TEMPLATE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/email-templates')
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Unable to load email templates.')
    } else {
      setTemplates(result.templates || [])
      setStarters(result.starters || [])
      setSelected((result.templates || [])[0] || (result.starters || [])[0] || BLANK_TEMPLATE)
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [])

  const save = async () => {
    setSaving(true)
    setError('')
    const response = await fetch('/api/admin/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Unable to save template.')
      notify({ tone: 'error', title: 'Template not saved', body: result.error || 'Check the fields and try again.' })
    } else {
      notify({ tone: 'success', title: 'Template saved', body: result.template.name })
      await load()
      setSelected(result.template)
    }
    setSaving(false)
  }

  if (loading) return <AdminSkeleton rows={5} />

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950">Email Templates</h1>
              <p className="mt-1 text-sm text-slate-500">Brand and polish system emails.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Saved</p>
          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-500">No saved templates yet.</p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.template_key}
                  type="button"
                  onClick={() => setSelected(template)}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${selected.template_key === template.template_key ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  <span className="block font-black">{template.name}</span>
                  <span className="mt-1 block text-xs opacity-70">{template.template_key}</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Starters</p>
          <div className="space-y-2">
            {starters.map((template) => (
              <button
                key={template.template_key}
                type="button"
                onClick={() => setSelected(template)}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <span className="block font-black">{template.name}</span>
                <span className="mt-1 block text-xs text-slate-500">{template.subject}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="space-y-4">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

        {!selected.template_key && templates.length === 0 ? (
          <AdminEmptyState title="No template selected" body="Choose a starter template to create your first branded email." />
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{selected.name || 'New template'}</h2>
                <p className="mt-2 text-sm text-slate-500">Use variables like {'{{organization_name}}'}, {'{{staff_name}}'}, and {'{{expiry_date}}'}.</p>
              </div>
              <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                <Save className="h-4 w-4" />
                <SavingLabel saving={saving} idle="Save template" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Template key" value={selected.template_key} onChange={(value) => setSelected((prev) => ({ ...prev, template_key: value }))} />
              <Field label="Name" value={selected.name} onChange={(value) => setSelected((prev) => ({ ...prev, name: value }))} />
              <div className="md:col-span-2">
                <Field label="Subject" value={selected.subject} onChange={(value) => setSelected((prev) => ({ ...prev, subject: value }))} />
              </div>
              <div className="md:col-span-2">
                <Field label="Preview text" value={selected.preview_text || ''} onChange={(value) => setSelected((prev) => ({ ...prev, preview_text: value }))} />
              </div>
              <TextArea label="HTML body" value={selected.body_html} onChange={(value) => setSelected((prev) => ({ ...prev, body_html: value }))} />
              <TextArea label="Plain text body" value={selected.body_text || ''} onChange={(value) => setSelected((prev) => ({ ...prev, body_text: value }))} />
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-black text-slate-950">Preview</h2>
          </div>
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Subject</p>
            <p className="mt-2 font-black text-slate-950">{selected.subject || 'No subject yet'}</p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Body</p>
            <div
              className="mt-2 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{
                __html: sanitizeEmailTemplateHtml(selected.body_html || '<p>No body yet.</p>'),
              }}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={8} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
    </label>
  )
}
