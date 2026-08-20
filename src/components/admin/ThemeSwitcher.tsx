'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Palette, RotateCcw, X } from 'lucide-react'
import { ORGANIZATION_THEMES } from '@/lib/saas-themes'
import { useToast } from '@/components/admin/ToastProvider'

export type ThemeSettings = {
  theme_key: string
  primary_color: string
  accent_color: string
  surface_color: string
}

type ThemeSwitcherProps = {
  organization: ThemeSettings
  onSaved: (theme: ThemeSettings) => void
}

export default function ThemeSwitcher({ organization, onSaved }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<ThemeSettings>(organization)
  const panelRef = useRef<HTMLDivElement>(null)
  const { notify } = useToast()

  useEffect(() => {
    setDraft(organization)
  }, [organization])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  const choosePreset = (theme: (typeof ORGANIZATION_THEMES)[number]) => {
    setDraft({
      theme_key: theme.key,
      primary_color: theme.primaryColor,
      accent_color: theme.accentColor,
      surface_color: theme.surfaceColor,
    })
  }

  const saveTheme = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.organization) {
        throw new Error(result?.error || 'Unable to save the workspace theme.')
      }

      onSaved(result.organization)
      setOpen(false)
      notify({
        tone: 'success',
        title: 'Theme updated',
        body: 'Your workspace colors are now live for everyone in this organization.',
      })
    } catch (error) {
      notify({
        tone: 'error',
        title: 'Theme was not saved',
        body: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Change workspace theme"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-10 items-center gap-2 rounded-xl border border-[var(--dx-line)] bg-white px-3 text-sm font-bold text-[var(--dx-muted-strong)] transition hover:bg-[var(--dx-surface-muted)]"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden xl:inline">Appearance</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Workspace appearance"
          className="fixed inset-x-3 top-16 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-[var(--dx-line)] bg-white p-5 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[410px]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-black text-slate-950">Workspace appearance</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Choose a starting style, then fine-tune your brand colors.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close appearance panel"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {ORGANIZATION_THEMES.map((theme) => {
              const selected = draft.theme_key === theme.key
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => choosePreset(theme)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? 'border-slate-900 ring-2 ring-slate-900/10'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex gap-1.5">
                      {[theme.primaryColor, theme.accentColor, theme.surfaceColor].map((color) => (
                        <span
                          key={color}
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                    {selected ? <Check className="h-4 w-4 text-slate-900" /> : null}
                  </span>
                  <span className="mt-2 block text-xs font-black text-slate-800">{theme.name}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ColorField
                label="Primary"
                value={draft.primary_color}
                onChange={(value) => setDraft((current) => ({ ...current, primary_color: value }))}
              />
              <ColorField
                label="Navigation"
                value={draft.accent_color}
                onChange={(value) => setDraft((current) => ({ ...current, accent_color: value }))}
              />
              <ColorField
                label="Canvas"
                value={draft.surface_color}
                onChange={(value) => setDraft((current) => ({ ...current, surface_color: value }))}
              />
            </div>

            <div
              className="mt-4 overflow-hidden rounded-xl border border-black/10"
              style={{ backgroundColor: draft.surface_color }}
            >
              <div
                className="flex items-center justify-between px-3 py-2 text-xs font-black text-white"
                style={{ backgroundColor: draft.accent_color }}
              >
                <span>Digital ID X</span>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: draft.primary_color }} />
              </div>
              <div className="p-3">
                <div className="h-7 rounded-lg bg-white/90" />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setDraft(organization)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={saveTheme}
              disabled={saving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Apply theme'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
          aria-label={`${label} color`}
        />
        <span className="font-mono text-[10px] font-bold uppercase text-slate-600">{value}</span>
      </span>
    </label>
  )
}
