'use client'

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'
type Toast = { id: number; title: string; description?: string; tone: ToastTone }
type ToastInput = Omit<Toast, 'id'>

const ToastContext = createContext<{ notify: (toast: ToastInput) => void } | null>(null)

export function PortalFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const sequence = useRef(0)
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const notify = useCallback((toast: ToastInput) => {
    const id = ++sequence.current
    setToasts((current) => [...current.slice(-3), { ...toast, id }])
    window.setTimeout(() => dismiss(id), 5200)
  }, [dismiss])
  const value = useMemo(() => ({ notify }), [notify])

  return <ToastContext.Provider value={value}>{children}<div className="fixed bottom-4 right-4 z-[120] flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2" role="region" aria-label="Portal notifications" aria-live="polite">{toasts.map((toast) => <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />)}</div></ToastContext.Provider>
}

export function usePortalFeedback() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('usePortalFeedback must be used inside PortalFeedbackProvider')
  return value
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertTriangle : Info
  const tone = toast.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : toast.tone === 'error' ? 'border-red-200 bg-red-50 text-red-950' : 'border-slate-200 bg-white text-slate-950'
  return <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-[0_20px_55px_rgba(15,23,42,.18)] ${tone}`}><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-black">{toast.title}</p>{toast.description ? <p className="mt-1 text-xs leading-5 opacity-70">{toast.description}</p> : null}</div><button type="button" onClick={onDismiss} className="rounded-lg p-1 opacity-55 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm action', tone = 'danger', reasonLabel, busy = false, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel?: string; tone?: 'danger' | 'warning' | 'primary'; reasonLabel?: string; busy?: boolean; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [busy, onCancel, open])

  if (!open) return null
  const confirmClass = tone === 'danger' ? 'bg-red-700 hover:bg-red-800' : tone === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#152019] hover:bg-[#26332b]'
  const reasonRequired = Boolean(reasonLabel)
  const cancel = () => { setReason(''); onCancel() }
  const confirm = () => { const value = reason.trim(); setReason(''); onConfirm(value) }
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}><button type="button" aria-label="Close confirmation" className="absolute inset-0 cursor-default" onClick={() => { if (!busy) cancel() }} /><section className="relative w-full max-w-lg rounded-[24px] border border-white/20 bg-white p-6 shadow-2xl"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone === 'danger' ? 'bg-red-100 text-red-700' : tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-[#e9f6cc] text-[#496126]'}`}><AlertTriangle className="h-5 w-5" /></span><h2 id={titleId} className="mt-5 text-xl font-black tracking-[-.03em]">{title}</h2><p id={descriptionId} className="mt-2 text-sm leading-6 text-[#68746c]">{description}</p>{reasonLabel ? <label className="mt-5 block text-xs font-black text-[#4f5c54]">{reasonLabel}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} autoFocus placeholder="Add a clear reason for the audit trail" className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-[#f7f8f5] p-3 text-sm font-medium outline-none focus:border-[#78924e]" /></label> : null}<div className="mt-6 flex justify-end gap-2"><button ref={cancelRef} type="button" disabled={busy} onClick={cancel} className="rounded-xl px-4 py-2.5 text-xs font-black text-[#657269] hover:bg-[#f2f4ef] disabled:opacity-50">Cancel</button><button type="button" disabled={busy || (reasonRequired && reason.trim().length < 8)} onClick={confirm} className={`rounded-xl px-4 py-2.5 text-xs font-black text-white disabled:opacity-40 ${confirmClass}`}>{busy ? 'Working…' : confirmLabel}</button></div></section></div>
}
