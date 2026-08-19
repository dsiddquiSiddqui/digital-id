'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'

type Toast = {
  id: string
  title: string
  body?: string
  tone: ToastTone
}

type ToastContextValue = {
  notify: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-slate-200 bg-white text-slate-800',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts((current) => [{ ...toast, id }, ...current].slice(0, 4))
      window.setTimeout(() => remove(id), 4500)
    },
    [remove]
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[80] w-[calc(100vw-2rem)] max-w-sm space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`rounded-2xl border p-4 shadow-lg backdrop-blur ${TONE_STYLES[toast.tone]}`}
          >
            <div className="flex items-start gap-3">
              <ToastIcon tone={toast.tone} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{toast.title}</p>
                {toast.body ? <p className="mt-1 text-sm opacity-80">{toast.body}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded-lg p-1 opacity-60 transition hover:bg-white/60 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      notify: () => undefined,
    }
  }
  return context
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
  if (tone === 'error') return <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
  return <Info className="mt-0.5 h-5 w-5 text-slate-500" />
}
