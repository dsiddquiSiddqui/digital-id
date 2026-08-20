'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, Upload, UserRound, X } from 'lucide-react'

type StaffDraft = {
  full_name: string
  employee_code: string
  parim_staff_id: string
  email: string
  phone: string
  second_phone: string
  create_login: boolean
  company_name: string
  staff_type: string
  status: string
  nationality: string
  country_of_birth: string
  gender: string
  date_of_birth: string
  access_to_car: boolean
  driver_licence: boolean
  notes: string
}

const INITIAL_DRAFT: StaffDraft = {
  full_name: '', employee_code: '', parim_staff_id: '', email: '', phone: '', second_phone: '', create_login: true,
  company_name: 'Security Services', staff_type: 'security', status: 'active', nationality: '', country_of_birth: '', gender: '', date_of_birth: '', access_to_car: false, driver_licence: false, notes: '',
}

const STEPS = [
  { key: 'identity', title: 'Identity', description: 'Who is this person?' },
  { key: 'access', title: 'Contact & access', description: 'How can they be reached?' },
  { key: 'assignment', title: 'Assignment', description: 'Where do they belong?' },
  { key: 'personal', title: 'Personal details', description: 'Optional profile information' },
  { key: 'review', title: 'Review', description: 'Confirm and create' },
] as const

const DRAFT_KEY = 'digital-id-x.staff-draft.v1'

export default function V2NewStaffPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [draft, setDraft] = useState<StaffDraft>(INITIAL_DRAFT)
  const [draftReady, setDraftReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(DRAFT_KEY)
      if (!stored) {
        setDraftReady(true)
        return
      }
      try {
        setDraft({ ...INITIAL_DRAFT, ...(JSON.parse(stored) as Partial<StaffDraft>) })
      } catch {
        window.localStorage.removeItem(DRAFT_KEY)
      }
      setDraftReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!draftReady) return
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, draftReady])

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(photo)
    setPhotoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo])

  const updateDraft = <Key extends keyof StaffDraft>(key: Key, value: StaffDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const validateStep = async () => {
    const currentStep = STEPS[step].key
    if (currentStep === 'review') return true
    if (currentStep === 'access' && draft.create_login) {
      if (password.length < 8) {
        setError('Temporary password must contain at least 8 characters.')
        return false
      }
      if (password !== confirmPassword) {
        setError('Temporary password and confirmation do not match.')
        return false
      }
    }

    setChecking(true)
    setError('')
    try {
      const response = await fetch('/api/v2/staff/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep, ...draft }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'This step could not be validated.')
      return true
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'This step could not be validated.')
      return false
    } finally {
      setChecking(false)
    }
  }

  const continueToNextStep = async () => {
    if (!(await validateStep())) return
    setCompletedSteps((current) => current.includes(step) ? current : [...current, step])
    setStep((current) => Math.min(STEPS.length - 1, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createStaff = async () => {
    setCreating(true)
    setError('')
    let photoUrl: string | null = null
    try {
      if (photo) {
        const uploadResponse = await fetch('/api/admin/upload-photo', {
          method: 'POST',
          body: photo,
          headers: { 'x-filename': `${Date.now()}-${photo.name}` },
        })
        const uploadResult = await uploadResponse.json()
        if (!uploadResponse.ok) throw new Error(uploadResult.error || 'The staff photo could not be uploaded.')
        photoUrl = uploadResult.url
      }

      const response = await fetch('/api/v2/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, password: draft.create_login ? password : null, photo_url: photoUrl }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'The staff record could not be created.')
      window.localStorage.removeItem(DRAFT_KEY)
      router.push(`/v2/staff/${result.staff_id}`)
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'The staff record could not be created.')
      setCreating(false)
    }
  }

  const resetDraft = () => {
    setDraft(INITIAL_DRAFT)
    setPassword('')
    setConfirmPassword('')
    setPhoto(null)
    setStep(0)
    setCompletedSteps([])
    window.localStorage.removeItem(DRAFT_KEY)
  }

  return (
    <div className="dx-page">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link href="/v2/staff" className="inline-flex items-center gap-2 text-xs font-black text-[var(--dx-muted)] transition hover:text-[var(--dx-ink)]"><ArrowLeft className="h-4 w-4" />Staff directory</Link>
        <span className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--dx-muted)]">Draft saved locally</span>
      </div>

      <header className="mb-6 max-w-3xl">
        <p className="dx-eyebrow">New staff record</p>
        <h1 className="dx-page-title">Add a person without the guesswork.</h1>
        <p className="dx-page-description">Each stage is checked against your workspace before you continue. You can leave and return to this draft on the same device.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="dx-surface h-fit p-3 lg:sticky lg:top-28">
          <ol className="space-y-1">
            {STEPS.map((item, index) => {
              const active = index === step
              const complete = completedSteps.includes(index)
              return <li key={item.key}><button type="button" onClick={() => { if (index <= step || complete) setStep(index) }} disabled={index > step && !complete} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition ${active ? 'bg-[var(--dx-signal-soft)] text-[var(--dx-signal)] ring-1 ring-inset ring-[#cdebd8]' : complete ? 'text-[var(--dx-ink)] hover:bg-[var(--dx-surface-muted)]' : 'cursor-not-allowed text-[var(--dx-muted)] opacity-55'}`}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-[var(--dx-signal)] text-white' : complete ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--dx-canvas)]'}`}>{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span><span className="block text-xs font-bold">{item.title}</span><span className="mt-1 block text-[10px] leading-4 text-[var(--dx-muted)]">{complete ? 'Database check passed' : item.description}</span></span></button></li>
            })}
          </ol>
          <button type="button" onClick={resetDraft} className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-black text-[var(--dx-muted)] transition hover:bg-[var(--dx-surface-muted)] hover:text-[var(--dx-ink)]">Discard draft</button>
        </aside>

        <main className="dx-surface overflow-hidden">
          <div className="border-b border-[var(--dx-line)] px-5 py-5 sm:px-7">
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--dx-muted)]">Step {step + 1} of {STEPS.length}</p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--dx-ink)]">{STEPS[step].title}</h2>
          </div>

          <div className="p-5 sm:p-7">
            {step === 0 ? <IdentityStep draft={draft} update={updateDraft} photo={photo} photoPreview={photoPreview} setPhoto={setPhoto} /> : null}
            {step === 1 ? <AccessStep draft={draft} update={updateDraft} password={password} confirmPassword={confirmPassword} setPassword={setPassword} setConfirmPassword={setConfirmPassword} showPassword={showPassword} setShowPassword={setShowPassword} /> : null}
            {step === 2 ? <AssignmentStep draft={draft} update={updateDraft} /> : null}
            {step === 3 ? <PersonalStep draft={draft} update={updateDraft} /> : null}
            {step === 4 ? <ReviewStep draft={draft} photoPreview={photoPreview} /> : null}

            {error ? <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--dx-line)] bg-[var(--dx-surface-muted)] px-5 py-4 sm:px-7">
            <button type="button" disabled={step === 0 || checking || creating} onClick={() => setStep((current) => Math.max(0, current - 1))} className="dx-button dx-button-secondary disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Back</button>
            {step < STEPS.length - 1 ? <button type="button" onClick={continueToNextStep} disabled={checking} className="dx-button dx-button-primary disabled:opacity-60">{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{checking ? 'Checking…' : 'Check & continue'}<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={createStaff} disabled={creating} className="dx-button dx-button-primary disabled:opacity-60">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{creating ? 'Creating staff…' : 'Create staff record'}</button>}
          </div>
        </main>
      </div>
    </div>
  )
}

type UpdateDraft = <Key extends keyof StaffDraft>(key: Key, value: StaffDraft[Key]) => void

function IdentityStep({ draft, update, photo, photoPreview, setPhoto }: { draft: StaffDraft; update: UpdateDraft; photo: File | null; photoPreview: string | null; setPhoto: (file: File | null) => void }) {
  return <div className="grid gap-5 sm:grid-cols-2"><Field label="Full name" required value={draft.full_name} onChange={(value) => update('full_name', value)} placeholder="Alex Morgan" className="sm:col-span-2" /><Field label="Employee code" required value={draft.employee_code} onChange={(value) => update('employee_code', value)} placeholder="DX-1042" hint="Checked for duplicates before continuing." /><Field label="External / PARiM ID" value={draft.parim_staff_id} onChange={(value) => update('parim_staff_id', value)} placeholder="Optional reference" /><div className="sm:col-span-2"><FieldLabel label="Profile photo" /><label className="mt-2 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-[var(--dx-line-strong)] bg-[var(--dx-surface-muted)] p-4 transition hover:border-[var(--dx-ink)]">{photoPreview ? <Image src={photoPreview} alt="Selected staff" width={64} height={64} unoptimized className="h-16 w-16 rounded-xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-[var(--dx-muted)]"><UserRound className="h-6 w-6" /></span>}<span className="min-w-0 flex-1"><span className="block text-sm font-black text-[var(--dx-ink)]">{photo?.name || 'Choose a staff photo'}</span><span className="mt-1 block text-xs text-[var(--dx-muted)]">A clear portrait works best on the Digital ID.</span></span><Upload className="h-5 w-5 text-[var(--dx-muted)]" /><input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label>{photo ? <button type="button" onClick={() => setPhoto(null)} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[var(--dx-muted)]"><X className="h-3.5 w-3.5" />Remove photo</button> : null}</div></div>
}

function AccessStep({ draft, update, password, confirmPassword, setPassword, setConfirmPassword, showPassword, setShowPassword }: { draft: StaffDraft; update: UpdateDraft; password: string; confirmPassword: string; setPassword: (value: string) => void; setConfirmPassword: (value: string) => void; showPassword: boolean; setShowPassword: (value: boolean) => void }) {
  return <div className="grid gap-5 sm:grid-cols-2"><Field label="Email address" required={draft.create_login} type="email" value={draft.email} onChange={(value) => update('email', value)} placeholder="alex@company.com" hint="Checked across staff and system users." className="sm:col-span-2" /><Field label="Primary phone" value={draft.phone} onChange={(value) => update('phone', value)} placeholder="+44 7700 900000" /><Field label="Second phone" value={draft.second_phone} onChange={(value) => update('second_phone', value)} placeholder="Optional" /><Toggle label="Create staff portal access" description="The person can sign in and view their Digital ID." checked={draft.create_login} onChange={(value) => update('create_login', value)} className="sm:col-span-2" />{draft.create_login ? <><PasswordField label="Temporary password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword(!showPassword)} /><PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} onToggle={() => setShowPassword(!showPassword)} /><p className="sm:col-span-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-700">Passwords are never stored in the local draft. They are only sent when the final staff record is created.</p></> : null}</div>
}

function AssignmentStep({ draft, update }: { draft: StaffDraft; update: UpdateDraft }) {
  return <div className="grid gap-5 sm:grid-cols-2"><Field label="Company or team" value={draft.company_name} onChange={(value) => update('company_name', value)} placeholder="Security Services" className="sm:col-span-2" /><SelectField label="Staff type" value={draft.staff_type} onChange={(value) => update('staff_type', value)} options={[['security', 'Security'], ['warehouse', 'Warehouse'], ['event', 'Event'], ['admin', 'Admin'], ['contractor', 'Contractor'], ['other', 'Other']]} /><SelectField label="Starting status" value={draft.status} onChange={(value) => update('status', value)} options={[['active', 'Active'], ['inactive', 'Inactive'], ['suspended', 'Suspended'], ['revoked', 'Revoked'], ['archived', 'Archived']]} /><Toggle label="Access to a car" description="Useful for assignments that require travel." checked={draft.access_to_car} onChange={(value) => update('access_to_car', value)} /><Toggle label="Driving licence" description="Licence details can be added under Documents." checked={draft.driver_licence} onChange={(value) => update('driver_licence', value)} /></div>
}

function PersonalStep({ draft, update }: { draft: StaffDraft; update: UpdateDraft }) {
  return <div className="grid gap-5 sm:grid-cols-2"><Field label="Nationality" value={draft.nationality} onChange={(value) => update('nationality', value)} placeholder="British" /><Field label="Country of birth" value={draft.country_of_birth} onChange={(value) => update('country_of_birth', value)} placeholder="United Kingdom" /><Field label="Gender" value={draft.gender} onChange={(value) => update('gender', value)} placeholder="Optional" /><Field label="Date of birth" type="date" value={draft.date_of_birth} onChange={(value) => update('date_of_birth', value)} /><label className="sm:col-span-2"><FieldLabel label="Internal notes" /><textarea value={draft.notes} onChange={(event) => update('notes', event.target.value)} rows={5} placeholder="Only add information relevant to staff operations." className="mt-2 w-full rounded-xl border border-[var(--dx-line)] bg-white px-3.5 py-3 text-sm text-[var(--dx-ink)] outline-none transition focus:border-[var(--dx-ink)]" /></label></div>
}

function ReviewStep({ draft, photoPreview }: { draft: StaffDraft; photoPreview: string | null }) {
  const rows = [['Employee code', draft.employee_code], ['Email', draft.email || 'Not provided'], ['Company', draft.company_name || 'Not provided'], ['Staff type', draft.staff_type], ['Starting status', draft.status], ['Portal access', draft.create_login ? 'Enabled' : 'Not enabled']]
  return <div><div className="flex items-center gap-4 rounded-xl bg-[var(--dx-surface-muted)] p-4">{photoPreview ? <Image src={photoPreview} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded-xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-[var(--dx-muted)]"><UserRound className="h-6 w-6" /></span>}<div><p className="text-lg font-black text-[var(--dx-ink)]">{draft.full_name}</p><p className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.1em] text-[var(--dx-muted)]">{draft.employee_code}</p></div></div><dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[var(--dx-line)] bg-[var(--dx-line)] sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="bg-white p-4"><dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--dx-muted)]">{label}</dt><dd className="mt-1.5 text-sm font-bold capitalize text-[var(--dx-ink)]">{value}</dd></div>)}</dl><div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-black">All previous steps passed their checks</p><p className="mt-1 text-xs leading-5 opacity-75">Digital ID X will run final safety checks again when creating the record.</p></div></div></div>
}

function Field({ label, value, onChange, required = false, type = 'text', placeholder, hint, className = '' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string; hint?: string; className?: string }) {
  return <label className={className}><FieldLabel label={label} required={required} /><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--dx-line)] bg-white px-3.5 text-sm font-semibold text-[var(--dx-ink)] outline-none transition placeholder:font-normal placeholder:text-[var(--dx-muted)] focus:border-[var(--dx-ink)]" />{hint ? <span className="mt-1.5 block text-[10px] font-semibold leading-4 text-[var(--dx-muted)]">{hint}</span> : null}</label>
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return <span className="text-xs font-black text-[var(--dx-muted-strong)]">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label><FieldLabel label={label} /><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--dx-line)] bg-white px-3.5 text-sm font-bold capitalize text-[var(--dx-ink)]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>
}

function Toggle({ label, description, checked, onChange, className = '' }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; className?: string }) {
  return <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--dx-line)] p-4 ${className}`}><span><span className="block text-sm font-black text-[var(--dx-ink)]">{label}</span><span className="mt-1 block text-xs leading-5 text-[var(--dx-muted)]">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[var(--dx-ink)]" /></label>
}

function PasswordField({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return <label><FieldLabel label={label} required /><span className="mt-2 flex min-h-11 items-center rounded-xl border border-[var(--dx-line)] bg-white px-3.5"><input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" /><button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="rounded-md p-1 text-[var(--dx-muted)]">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
}
