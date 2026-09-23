'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  Image as ImageIcon,
  BadgeDollarSign,
  RotateCcw,
  Save,
  Settings,
  UploadCloud,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type ThemeKey } from '@/lib/saas-themes'
import {
  BILLING_PLANS,
  formatPlanLimit,
  getBillingPlan,
  type BillingPlanKey,
} from '@/lib/billing-plans'

type Organization = {
  id: string
  name: string
  slug: string
  status: string
  plan: BillingPlanKey
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
  const [savingPlan, setSavingPlan] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingField, setUploadingField] = useState<BrandAssetField | null>(null)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'free' as BillingPlanKey,
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
          'id, role, organization_id, organizations:organizations(id, name, slug, status, plan, logo_url, favicon_url, background_image_url, support_email, support_phone, verification_title, theme_key, primary_color, accent_color, surface_color)'
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
          plan: org.plan || 'free',
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
    '--settings-primary': '#17834b',
    '--settings-accent': '#17202a',
    '--settings-surface': '#f7f8fa',
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

  const resetToSaved = () => {
    if (!organization) return

    setMessage('')
    setError('')
    setForm({
      name: organization.name || '',
      slug: organization.slug || '',
      plan: organization.plan || 'free',
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

  const selectedPlan = useMemo(() => getBillingPlan(form.plan), [form.plan])

  const handlePlanChange = async (plan: BillingPlanKey) => {
    setSavingPlan(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/organization-plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to update package.')
        return
      }

      setOrganization(result.organization)
      setForm((prev) => ({ ...prev, plan: result.organization.plan }))
      setMessage(`Package changed to ${getBillingPlan(plan).name}.`)
    } catch {
      setError('Something went wrong while updating the package.')
    } finally {
      setSavingPlan(false)
    }
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
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Settings className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                Organization Settings
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Manage workspace identity, URL slug, and the theme used across
                the admin dashboard, staff portal, and verification screens.
              </p>
            </div>
          </div>

          {organization ? (
            <a
              href={`/login?workspace=${organization.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400"
            >
              View login
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <Building2 className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Workspace Details
                </h2>
                <p className="text-sm text-slate-500">
                  These values identify the organization in the app.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Organization name"
                value={form.name}
                onChange={handleNameChange}
                placeholder="Acme Security Services"
                required
              />
              <TextField
                label="Workspace slug"
                value={form.slug}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, slug: slugify(value) }))
                }
                placeholder="acme-security"
                required
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <BadgeCheck className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Verification Support
                </h2>
                <p className="text-sm text-slate-500">
                  These details appear on public staff ID verification pages.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Verification page title"
                value={form.verification_title}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, verification_title: value }))
                }
                placeholder="Acme Staff Verification"
                className="md:col-span-2"
              />
              <TextField
                label="Support email"
                value={form.support_email}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, support_email: value }))
                }
                placeholder="support@example.com"
              />
              <TextField
                label="Support phone"
                value={form.support_phone}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, support_phone: value }))
                }
                placeholder="+44 20 0000 0000"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <BadgeDollarSign className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Package
                </h2>
                <p className="text-sm text-slate-500">
                  Only organization admins can change the active package.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {BILLING_PLANS.map((plan) => {
                const active = form.plan === plan.key

                return (
                  <button
                    key={plan.key}
                    type="button"
                    disabled={savingPlan || active}
                    onClick={() => handlePlanChange(plan.key)}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                      active
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-950 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-sm font-black">{plan.name}</span>
                    <span className="mt-2 block text-2xl font-black">
                      {plan.monthlyPrice === null ? 'Custom' : `GBP ${plan.monthlyPrice}`}
                    </span>
                    <span
                      className={`mt-2 block text-xs font-semibold leading-5 ${
                        active ? 'text-white/65' : 'text-slate-500'
                      }`}
                    >
                      {formatPlanLimit(plan.userLimit, 'admin users')}
                      <br />
                      {formatPlanLimit(plan.staffLimit, 'staff records')}
                    </span>
                    <span
                      className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                        active
                          ? 'bg-white text-slate-950'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {active ? 'Current package' : 'Change package'}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
              Current package: {selectedPlan.name}. Limit enforcement should be
              added before paid launch so organizations cannot exceed their plan
              by API or bulk upload.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <ImageIcon className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Brand Assets
                </h2>
                <p className="text-sm text-slate-500">
                  Upload brand files or paste hosted URLs for this workspace.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
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
                placeholder="https://example.com/background.jpg"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3">
                <BadgeCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Product appearance
                </h2>
                <p className="text-sm text-slate-500">
                  A consistent interface keeps every workspace clear and familiar.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-[#17834b] ring-4 ring-white" />
              <div>
                <p className="text-sm font-bold text-slate-900">Digital ID X standard</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">White and slate surfaces with Digital ID X green for primary actions and active states. Your organization logo and favicon remain customizable above.</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
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
                  <h2 className="mt-3 text-3xl font-black">{form.name || 'Organization'}</h2>
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
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save settings'}
            </button>
            <button
              type="button"
              onClick={resetToSaved}
              disabled={saving || !organization}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
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
  placeholder: string
  guidance: string
  previewStyle: 'logo' | 'favicon' | 'background'
}) {
  const validUrl = safeAssetUrl(value)

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_168px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <TextField
            label={`${label} URL`}
            value={value}
            onChange={onUrlChange}
            placeholder={placeholder}
            className="flex-1"
          />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
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
        <AssetPreview label={label} src={value} style={previewStyle} />
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{guidance}</p>
      {value && !validUrl ? <p role="alert" className="mt-2 text-xs font-bold text-amber-700">Enter a complete http:// or https:// image URL, or upload a file.</p> : null}
      {value ? (
        <p className="mt-3 truncate text-xs font-semibold text-slate-500">
          Current file: {value}
        </p>
      ) : null}
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
