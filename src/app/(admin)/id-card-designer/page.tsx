'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { BadgeCheck, IdCard, Printer, Save } from 'lucide-react'

type Template = {
  layout: 'classic' | 'compact' | 'bold'
  orientation: 'portrait' | 'landscape'
  primaryColor: string
  accentColor: string
  showLogo: boolean
  showQr: boolean
  showSia: boolean
  showIssueDate: boolean
  showExpiryDate: boolean
  headerText: string
  footerText: string
}

const DEFAULT_TEMPLATE: Template = {
  layout: 'classic',
  orientation: 'portrait',
  primaryColor: '#081a33',
  accentColor: '#0094e0',
  showLogo: true,
  showQr: true,
  showSia: true,
  showIssueDate: true,
  showExpiryDate: true,
  headerText: 'Digital Staff ID',
  footerText: 'Verified Digital Identity',
}

export default function IdCardDesignerPage() {
  const [template, setTemplate] = useState<Template>(DEFAULT_TEMPLATE)
  const [organization, setOrganization] = useState<{ name?: string; logo_url?: string | null }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [scale, setScale] = useState(100)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/id-card-template')
      const result = await response.json()
      if (!response.ok) setError(result.error || 'Unable to load ID template.')
      else {
        setTemplate({ ...DEFAULT_TEMPLATE, ...result.template })
        setOrganization(result.organization || {})
      }
      setLoading(false)
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    const response = await fetch('/api/admin/id-card-template', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to save template.')
    else {
      setTemplate({ ...DEFAULT_TEMPLATE, ...result.template })
      setMessage('ID card template saved.')
    }
    setSaving(false)
  }

  if (loading) return <Panel>Loading designer...</Panel>

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">ID Card Designer</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Configure the default card design used for new and previewed staff IDs.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Layout</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SelectField label="Layout style" value={template.layout} onChange={(value) => setTemplate((prev) => ({ ...prev, layout: value as Template['layout'] }))} options={['classic', 'compact', 'bold']} />
            <SelectField label="Orientation" value={template.orientation} onChange={(value) => setTemplate((prev) => ({ ...prev, orientation: value as Template['orientation'] }))} options={['portrait', 'landscape']} />
            <TextField label="Header text" value={template.headerText} onChange={(value) => setTemplate((prev) => ({ ...prev, headerText: value }))} />
            <TextField label="Footer text" value={template.footerText} onChange={(value) => setTemplate((prev) => ({ ...prev, footerText: value }))} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Preview side</span>
              <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {(['front', 'back'] as const).map((item) => (
                  <button key={item} type="button" onClick={() => setSide(item)} className={`rounded-xl px-4 py-2 text-sm font-black capitalize ${side === item ? 'bg-slate-950 text-white' : 'text-slate-500'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Preview scale</span>
              <input type="range" min={80} max={120} value={scale} onChange={(event) => setScale(Number(event.target.value))} className="w-full accent-slate-950" />
              <span className="mt-1 block text-xs font-bold text-slate-400">{scale}%</span>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Colors And Fields</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ColorField label="Primary color" value={template.primaryColor} onChange={(value) => setTemplate((prev) => ({ ...prev, primaryColor: value }))} />
            <ColorField label="Accent color" value={template.accentColor} onChange={(value) => setTemplate((prev) => ({ ...prev, accentColor: value }))} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(['showLogo', 'showQr', 'showSia', 'showIssueDate', 'showExpiryDate'] as const).map((key) => (
              <button key={key} type="button" onClick={() => setTemplate((prev) => ({ ...prev, [key]: !prev[key] }))} className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${template[key] ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                {key.replace('show', 'Show ')}
              </button>
            ))}
          </div>
        </section>

        {error ? <Panel tone="danger">{error}</Panel> : null}
        {message ? <Panel tone="success">{message}</Panel> : null}

        <div className="flex flex-wrap gap-3">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save template'}
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
            <Printer className="h-4 w-4" />
            Print preview
          </button>
        </div>
      </section>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <CardPreview template={template} organization={organization} side={side} scale={scale} />
      </aside>
    </div>
  )
}

function CardPreview({ template, organization, side, scale }: { template: Template; organization: { name?: string; logo_url?: string | null }; side: 'front' | 'back'; scale: number }) {
  const landscape = template.orientation === 'landscape'
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm font-black text-slate-950">Live preview</p>
      <div className="origin-top" style={{ transform: `scale(${scale / 100})`, minHeight: scale > 100 ? 520 : undefined }}>
      <div className={`mx-auto overflow-hidden rounded-[26px] border border-slate-300 bg-white shadow-xl ${landscape ? 'w-[380px]' : 'w-[320px]'}`}>
        <div className="px-5 py-5 text-white" style={{ backgroundColor: template.primaryColor }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">{template.headerText}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">{organization.name || 'Organization'}</p>
            </div>
            {template.showLogo ? (
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                {organization.logo_url ? <Image src={organization.logo_url} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : <BadgeCheck className="h-5 w-5" />}
              </div>
            ) : null}
          </div>
        </div>
        {side === 'front' ? (
        <div className={`p-5 ${landscape ? 'grid grid-cols-[0.8fr_1fr] gap-4' : ''}`}>
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">PHOTO</div>
            <h3 className="mt-4 text-xl font-black text-slate-950">Aisha Khan</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: template.accentColor }}>Security Officer</p>
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <PreviewRow label="Employee" value="EMP-1042" />
            <PreviewRow label="ID Number" value="SID-92841" />
            {template.showSia ? <PreviewRow label="SIA" value="1234567890" /> : null}
            {template.showIssueDate ? <PreviewRow label="Issue" value="26/06/2026" /> : null}
            {template.showExpiryDate ? <PreviewRow label="Expiry" value="26/06/2027" /> : null}
          </div>
          {template.showQr ? <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-xs font-black text-slate-400">QR VERIFY</div> : null}
        </div>
        ) : (
          <div className="p-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <p className="font-black text-slate-950">Verification instructions</p>
              <p className="mt-2">Scan the QR code or visit the public verification page to confirm identity, status, and expiry.</p>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white">
              Terms - Lost cards must be reported immediately
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <PreviewRow label="Support" value="Admin" />
              <PreviewRow label="Status" value="Live" />
            </div>
          </div>
        )}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-black" style={{ color: template.primaryColor }}>{template.footerText}</div>
      </div>
      </div>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="font-bold text-slate-500">{label}</span><span className="font-black text-slate-950">{value}</span></div>
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" /></label>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold capitalize outline-none focus:border-slate-950">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><span className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-12" /><input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 text-sm font-bold outline-none" /></span></label>
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>{children}</div>
}
