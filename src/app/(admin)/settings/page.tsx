'use client'

import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  LifeBuoy,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ORGANIZATION_THEMES, type ThemeKey } from '@/lib/saas-themes'

type Organization = {
  id: string
  name: string
  slug: string
  status: string
  logo_url: string | null
  favicon_url: string | null
  background_image_url: string | null
  support_email: string | null
  support_phone: string | null
  verification_title: string | null
  theme_key: ThemeKey
  primary_color: string
  accent_color: string
  surface_color: string
}

type Profile = {
  id: string
  role: string
  organization_id: string | null
  organizations: Organization | Organization[] | null
}

const ADMIN_ROLES = ['super_admin', 'admin']
type BrandAssetField = 'logo_url' | 'favicon_url' | 'background_image_url'

function normalizeOrganization(
  organization: Profile['organizations']
): Organization | null {
  if (Array.isArray(organization)) return organization[0] ?? null
  return organization ?? null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function safeAssetUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export default function OrganizationSettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [copiedOrganizationId, setCopiedOrganizationId] = useState(false)
  const [uploadingField, setUploadingField] = useState<BrandAssetField | null>(null)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo_url: '',
    favicon_url: '',
    background_image_url: '',
    support_email: '',
    support_phone: '',
    verification_title: '',
    theme_key: 'command-blue' as ThemeKey,
    primary_color: '#0f6bff',
    accent_color: '#10b981',
    surface_color: '#f8fafc',
  })

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      setError('')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Please log in again.')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          'id, role, organization_id, organizations:organizations(id, name, slug, status, logo_url, favicon_url, background_image_url, support_email, support_phone, verification_title, theme_key, primary_color, accent_color, surface_color)'
        )
        .eq('auth_user_id', user.id)
        .single<Profile>()

      if (profileError || !profile) {
        setError('Unable to load your organization settings.')
        setLoading(false)
        return
      }

      const isAllowed = ADMIN_ROLES.includes(profile.role)
      setAllowed(isAllowed)

      const org = normalizeOrganization(profile.organizations)
      setOrganization(org)

      if (org) {
        setForm({
          name: org.name || '',
          slug: org.slug || '',
          logo_url: org.logo_url || '',
          favicon_url: org.favicon_url || '',
          background_image_url: org.background_image_url || '',
          support_email: org.support_email || '',
          support_phone: org.support_phone || '',
          verification_title: org.verification_title || '',
          theme_key: org.theme_key || 'command-blue',
          primary_color: org.primary_color || '#0f6bff',
          accent_color: org.accent_color || '#10b981',
          surface_color: org.surface_color || '#f8fafc',
        })
      }

      setLoading(false)
    }

    loadSettings()
  }, [supabase])

  const previewStyle = {
    '--settings-primary': form.primary_color,
    '--settings-accent': form.accent_color,
    '--settings-surface': form.surface_color,
  } as CSSProperties
  const safeBackgroundImageUrl = safeAssetUrl(form.background_image_url)

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug:
        !organization || prev.slug === organization.slug || prev.slug === slugify(prev.name)
          ? slugify(value)
          : prev.slug,
    }))
  }

  const copyOrganizationId = async () => {
    if (!organization?.id) return

    try {
      await navigator.clipboard.writeText(organization.id)
      setCopiedOrganizationId(true)
      window.setTimeout(() => setCopiedOrganizationId(false), 1800)
    } catch {
      setError('Unable to copy the Organization ID. Select it and copy it manually.')
    }
  }

  const applyTheme = (themeKey: ThemeKey) => {
    const theme = ORGANIZATION_THEMES.find((candidate) => candidate.key === themeKey)
    if (!theme) return
    setForm((prev) => ({
      ...prev,
      theme_key: theme.key,
      primary_color: theme.primaryColor,
      accent_color: theme.accentColor,
      surface_color: theme.surfaceColor,
    }))
  }

  const resetToSaved = () => {
    if (!organization) return

    setMessage('')
    setError('')
    setForm({
      name: organization.name || '',
      slug: organization.slug || '',
      logo_url: organization.logo_url || '',
      favicon_url: organization.favicon_url || '',
      background_image_url: organization.background_image_url || '',
      support_email: organization.support_email || '',
      support_phone: organization.support_phone || '',
      verification_title: organization.verification_title || '',
      theme_key: organization.theme_key || 'command-blue',
      primary_color: organization.primary_color || '#0f6bff',
      accent_color: organization.accent_color || '#10b981',
      surface_color: organization.surface_color || '#f8fafc',
    })
  }

  const handleBrandAssetUpload = async (
    field: BrandAssetField,
    file: File | null
  ) => {
    if (!file) return

    setMessage('')
    setError('')
    setUploadingField(field)

    const safeFileName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90)
    const workspaceSlug = form.slug || organization?.slug || 'workspace'
    const filename = `branding/${workspaceSlug}/${field}-${Date.now()}-${safeFileName}`

    try {
      const uploadRes = await fetch('/api/admin/upload-photo', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-filename': filename,
        },
        body: file,
      })

      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        setError(uploadData.error || 'Failed to upload brand asset.')
        return
      }

      setForm((prev) => ({ ...prev, [field]: uploadData.url || '' }))
      setMessage('Brand asset uploaded. Save settings to apply it.')
    } catch {
      setError('Something went wrong while uploading the brand asset.')
    } finally {
      setUploadingField(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/organization-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to save organization settings.')
        return
      }

      setOrganization(result.organization)
      setMessage('Organization settings saved. Refreshing theme...')

      window.setTimeout(() => {
        window.location.reload()
      }, 650)
    } catch {
      setError('Something went wrong while saving settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading organization settings...</p>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-black text-amber-900">Admin access required</h1>
        <p className="mt-2 text-sm text-amber-700">
          Only organization admins can update workspace settings.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#12251f] px-6 py-8 text-white shadow-2xl shadow-emerald-950/15 sm:px-8 lg:px-10">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-emerald-300/20" />
        <div className="absolute right-16 top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-200/75"><Sparkles className="h-3.5 w-3.5" /> Workspace control</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Make this workspace<br className="hidden sm:block" /> unmistakably yours.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/70">Set the public identity your team, staff, and verification visitors experience—then review it live before saving.</p>
          </div>
          {organization ? <a href={`/login?workspace=${organization.slug}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black transition hover:bg-white hover:text-[#12251f]">Open workspace <ExternalLink className="h-4 w-4" /></a> : null}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 xl:grid-cols-[180px_minmax(0,1fr)_360px]">
        <nav className="hidden xl:block">
          <div className="sticky top-6 space-y-1 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">In this page</p>
            <SettingsNav href="#identity" icon={<Building2 className="h-4 w-4" />} label="Identity" />
            <SettingsNav href="#support" icon={<LifeBuoy className="h-4 w-4" />} label="Verification" />
            <SettingsNav href="#assets" icon={<ImageIcon className="h-4 w-4" />} label="Brand assets" />
            <SettingsNav href="#appearance" icon={<Palette className="h-4 w-4" />} label="Appearance" />
          </div>
        </nav>

        <section className="space-y-5">
          <div id="identity" className="scroll-mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <SectionHeading eyebrow="01 / Workspace" title="The essentials" description="The name and address that anchor this workspace across Digital ID X." icon={<Building2 className="h-5 w-5" />} />
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <TextField label="Organization name" value={form.name} onChange={handleNameChange} placeholder="Acme Security Services" required />
              <TextField label="Workspace slug" value={form.slug} onChange={(value) => setForm((prev) => ({ ...prev, slug: slugify(value) }))} placeholder="acme-security" required />
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Organization ID</p>
                  <p className="mt-2 break-all font-mono text-sm font-bold text-slate-950">{organization?.id || 'Not assigned'}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Your permanent workspace identifier for support requests, integrations, and audit references. It cannot be edited.</p>
                </div>
                <button type="button" onClick={() => void copyOrganizationId()} disabled={!organization?.id} aria-label="Copy Organization ID" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-xs font-black text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50">
                  {copiedOrganizationId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedOrganizationId ? 'Copied' : 'Copy ID'}
                </button>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500"><Globe2 className="h-4 w-4 text-emerald-700" /><span>Workspace sign-in: <span className="font-black text-slate-800">/login?workspace={form.slug || 'your-workspace'}</span></span></div>
          </div>

          <div id="support" className="scroll-mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <SectionHeading eyebrow="02 / Public verification" title="Give visitors a clear way to reach you" description="These details appear when someone verifies a staff identity." icon={<BadgeCheck className="h-5 w-5" />} />
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <TextField label="Verification page title" value={form.verification_title} onChange={(value) => setForm((prev) => ({ ...prev, verification_title: value }))} placeholder="Acme Staff Verification" className="md:col-span-2" />
              <TextField label="Support email" value={form.support_email} onChange={(value) => setForm((prev) => ({ ...prev, support_email: value }))} placeholder="support@example.com" />
              <TextField label="Support phone" value={form.support_phone} onChange={(value) => setForm((prev) => ({ ...prev, support_phone: value }))} placeholder="+44 20 0000 0000" />
            </div>
          </div>

          <div id="assets" className="scroll-mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <SectionHeading eyebrow="03 / Brand library" title="The marks people recognise" description="Upload a file or connect a trusted hosted image. The preview updates as you work." icon={<ImageIcon className="h-5 w-5" />} />
            <div className="mt-7 grid gap-4">
              <AssetField
                label="Logo"
                value={form.logo_url}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                guidance="Recommended: 800 × 240 px, PNG or SVG, transparent background, up to 8 MB."
                previewStyle="logo"
                uploading={uploadingField === 'logo_url'}
                onUpload={(file) => handleBrandAssetUpload('logo_url', file)}
                onUrlChange={(value) =>
                  setForm((prev) => ({ ...prev, logo_url: value }))
                }
                onRemove={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
                placeholder="https://example.com/logo.png"
              />
              <AssetField
                label="Favicon"
                value={form.favicon_url}
                accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
                guidance="Recommended: 512 × 512 px PNG (or ICO). Use a simple mark that remains clear at 16 px."
                previewStyle="favicon"
                uploading={uploadingField === 'favicon_url'}
                onUpload={(file) => handleBrandAssetUpload('favicon_url', file)}
                onUrlChange={(value) =>
                  setForm((prev) => ({ ...prev, favicon_url: value }))
                }
                onRemove={() => setForm((prev) => ({ ...prev, favicon_url: '' }))}
                placeholder="https://example.com/favicon.png"
              />
              <AssetField
                label="Background"
                value={form.background_image_url}
                accept="image/png,image/jpeg,image/webp"
                guidance="Recommended: 1920 × 1080 px JPG or WebP, landscape orientation, up to 8 MB."
                previewStyle="background"
                uploading={uploadingField === 'background_image_url'}
                onUpload={(file) =>
                  handleBrandAssetUpload('background_image_url', file)
                }
                onUrlChange={(value) =>
                  setForm((prev) => ({ ...prev, background_image_url: value }))
                }
                onRemove={() => setForm((prev) => ({ ...prev, background_image_url: '' }))}
                placeholder="https://example.com/background.jpg"
              />
            </div>
          </div>

          <div id="appearance" className="scroll-mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-5 bg-[#f2f7f4] p-6 sm:p-8">
              <SectionHeading eyebrow="04 / Interface" title="Choose the workspace look" description="Pick a foundation, then fine-tune the three colour tokens below. The live preview changes immediately." icon={<Palette className="h-5 w-5" />} />
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Foundation palette</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ORGANIZATION_THEMES.map((theme) => {
                  const active = form.theme_key === theme.key
                  return <button key={theme.key} type="button" onClick={() => applyTheme(theme.key)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full" style={{ backgroundColor: theme.primaryColor }} /><span className="h-5 w-5 rounded-full" style={{ backgroundColor: theme.accentColor }} /><span className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: theme.surfaceColor }} /></span>
                    <span className="mt-3 block text-sm font-black text-slate-950">{theme.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{theme.description}</span>
                  </button>
                })}
              </div>
              <div className="mt-7 border-t border-slate-100 pt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Fine tune colours</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <ColorField label="Primary action" value={form.primary_color} onChange={(value) => setForm((prev) => ({ ...prev, primary_color: value }))} />
                  <ColorField label="Accent / header" value={form.accent_color} onChange={(value) => setForm((prev) => ({ ...prev, accent_color: value }))} />
                  <ColorField label="Workspace surface" value={form.surface_color} onChange={(value) => setForm((prev) => ({ ...prev, surface_color: value }))} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section
            className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/50"
            style={previewStyle}
          >
            <div
              className="bg-[var(--settings-accent)] bg-cover bg-center p-6 text-white"
              style={
                safeBackgroundImageUrl
                  ? {
                      backgroundImage: `linear-gradient(rgba(15,23,42,0.62), rgba(15,23,42,0.62)), url("${safeBackgroundImageUrl}")`,
                    }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
                    Live Preview
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight">{form.name || 'Organization'}</h2>
                  <p className="mt-2 text-sm text-white/70">/{form.slug || 'workspace'}</p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                  <SafeAssetImage src={form.logo_url} alt={`${form.name || 'Organization'} logo`} className="h-full w-full object-contain p-1" fallback={<BadgeCheck className="h-6 w-6 text-white/70" />} />
                </div>
              </div>
            </div>

            <div className="bg-[var(--settings-surface)] p-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Dashboard
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Digital ID X standard
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--settings-primary)] px-3 py-1 text-xs font-black text-white">
                    Active
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Browser icon
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {form.favicon_url ? 'Custom favicon ready' : 'Default favicon'}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <SafeAssetImage src={form.favicon_url} alt="Workspace favicon" className="h-full w-full object-contain p-1" fallback={<ImageIcon className="h-5 w-5 text-slate-400" />} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <PreviewMetric label="Staff" value="128" />
                  <PreviewMetric label="IDs" value="121" />
                  <PreviewMetric label="Alerts" value="03" />
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="rounded-[1.5rem] bg-slate-950 p-3 shadow-xl shadow-slate-950/15">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save settings'}
            </button>
            <button
              type="button"
              onClick={resetToSaved}
              disabled={saving || !organization}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}

function SettingsNav({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} className="group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-900">
      <span className="text-slate-400 transition group-hover:text-emerald-700">{icon}</span>
      <span>{label}</span>
      <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </a>
  )
}

function SectionHeading({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span className="text-xs font-black text-slate-700">{label}</span>
      <span className="mt-3 flex items-center gap-3 rounded-xl bg-white p-2 shadow-sm">
        <input aria-label={`${label} colour`} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-8 cursor-pointer rounded-md border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value)} pattern="^#[0-9a-fA-F]{6}$" className="min-w-0 flex-1 bg-transparent text-sm font-bold uppercase text-slate-700 outline-none" />
      </span>
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
      />
    </label>
  )
}

function AssetField({
  label,
  value,
  accept,
  uploading,
  onUpload,
  onUrlChange,
  onRemove,
  placeholder,
  guidance,
  previewStyle,
}: {
  label: string
  value: string
  accept: string
  uploading: boolean
  onUpload: (file: File | null) => void
  onUrlChange: (value: string) => void
  onRemove: () => void
  placeholder: string
  guidance: string
  previewStyle: 'logo' | 'favicon' | 'background'
}) {
  const validUrl = safeAssetUrl(value)

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[132px_minmax(0,1fr)]">
        <AssetPreview label={label} src={value} style={previewStyle} />
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-sm font-black text-slate-950">{label}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{guidance}</p></div>
            {value ? <button type="button" onClick={onRemove} className="text-xs font-black text-slate-500 transition hover:text-red-700">Remove</button> : null}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            label="Hosted image URL"
            value={value}
            onChange={onUrlChange}
            placeholder={placeholder}
            className="flex-1"
          />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 sm:shrink-0">
            <UploadCloud className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              accept={accept}
              disabled={uploading}
              onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </div>
        {value && !validUrl ? <p role="alert" className="mt-3 text-xs font-bold text-amber-700">Enter a complete http:// or https:// image URL, or upload a file.</p> : null}
        {value ? <p className="mt-3 truncate text-xs font-semibold text-slate-500">Connected: {value}</p> : <p className="mt-3 text-xs font-semibold text-slate-400">No file connected yet.</p>}
        </div>
      </div>
    </div>
  )
}

function AssetPreview({ label, src, style }: { label: string; src: string; style: 'logo' | 'favicon' | 'background' }) {
  const frameClass = style === 'background' ? 'h-24' : style === 'favicon' ? 'h-20 w-20' : 'h-20'
  const fitClass = style === 'background' ? 'object-cover' : 'object-contain p-2'

  return <div className={`relative flex ${frameClass} items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white`}>
    <SafeAssetImage src={src} alt={`${label} preview`} className={`h-full w-full ${fitClass}`} fallback={<span className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}<br />preview</span>} />
  </div>
}

function SafeAssetImage({ src, alt, className, fallback }: { src: string; alt: string; className: string; fallback: React.ReactNode }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const safeSrc = safeAssetUrl(src)
  const failed = failedSource === src

  if (!safeSrc || failed) return <>{fallback}</>
  // This intentionally uses a native image so a user-entered URL cannot invoke the Next image optimizer while it is incomplete or untrusted.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={safeSrc} alt={alt} className={className} onError={() => setFailedSource(src)} />
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}
