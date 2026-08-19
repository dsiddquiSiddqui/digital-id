'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckSquare, Play, RotateCcw, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type StaffRow = { id: string; full_name: string; employee_code: string; status: string; staff_type: string }
type BatchRow = {
  id: string
  action_type: string
  target_count: number
  success_count: number
  failed_count: number
  status: string
  approval_status?: string
  rollback_until?: string | null
  rolled_back_at?: string | null
  created_at: string
}
type Preview = { successCount: number; failedCount: number; approval_required: boolean; rollback_minutes: number } | null

export default function BulkActionsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('active')
  const [action, setAction] = useState('set_status')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [rollingBackId, setRollingBackId] = useState('')
  const [preview, setPreview] = useState<Preview>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('auth_user_id', userData.user?.id).single()
    if (profile?.organization_id) {
      const { data } = await supabase.from('staff').select('id, full_name, employee_code, status, staff_type').eq('organization_id', profile.organization_id).order('full_name')
      setStaff((data || []) as StaffRow[])
    }
    const response = await fetch('/api/admin/bulk-actions')
    const result = await response.json()
    if (response.ok) setBatches(result.batches || [])
    setCurrentTime(Date.now())
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return staff.filter((row) => !q || row.full_name.toLowerCase().includes(q) || row.employee_code.toLowerCase().includes(q))
  }, [staff, query])

  const toggleAll = () => {
    const visibleIds = filtered.map((row) => row.id)
    const allSelected = visibleIds.every((id) => selected.includes(id))
    setSelected(allSelected ? selected.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])))
  }

  const run = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/bulk-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, status, staff_ids: selected }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Bulk action failed.')
    else {
      setMessage(`${result.success_count} updated, ${result.failed_count} skipped.`)
      setSelected([])
      await load()
    }
    setSaving(false)
  }

  const previewAction = async () => {
    setPreviewing(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/bulk-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, status, staff_ids: selected, preview: true }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Preview failed.')
    else setPreview(result)
    setPreviewing(false)
  }

  const rollback = async (batchId: string) => {
    setRollingBackId(batchId)
    setError('')
    setMessage('')
    const response = await fetch('/api/admin/bulk-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rollback', batch_id: batchId }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Rollback failed.')
    else {
      setMessage(`${result.restored_count} staff records restored.`)
      await load()
    }
    setRollingBackId('')
  }

  if (loading) return <Panel>Loading bulk actions...</Panel>

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><CheckSquare className="h-5 w-5" /></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Bulk Actions</h1>
            <p className="mt-2 text-sm text-slate-500">Select staff and apply safe operational changes in one audited batch.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center rounded-2xl border border-slate-200 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff..." className="min-w-[220px] bg-transparent px-3 text-sm outline-none" />
            </div>
            <button onClick={toggleAll} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Toggle visible</button>
          </div>
          <div className="max-h-[620px] overflow-auto">
            {filtered.map((row) => (
              <label key={row.id} className="flex cursor-pointer items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
                <span>
                  <span className="block font-black text-slate-950">{row.full_name}</span>
                  <span className="text-sm text-slate-500">{row.employee_code} - {row.status}</span>
                </span>
                <input type="checkbox" checked={selected.includes(row.id)} onChange={() => setSelected((prev) => prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id])} className="h-5 w-5" />
              </label>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Action</h2>
            <p className="mt-1 text-sm text-slate-500">{selected.length} selected</p>
            <select value={action} onChange={(event) => setAction(event.target.value)} className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none">
              <option value="set_status">Set staff status</option>
              <option value="archive_missing_ids">Archive selected without IDs</option>
            </select>
            {action === 'set_status' ? (
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none">
                {['active', 'inactive', 'suspended', 'revoked', 'archived'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            ) : null}
            <button onClick={run} disabled={saving || selected.length === 0} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
              <Play className="h-4 w-4" />
              {saving ? 'Running...' : 'Run action'}
            </button>
            <button onClick={previewAction} disabled={previewing || selected.length === 0} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-60">
              <Search className="h-4 w-4" />
              {previewing ? 'Checking...' : 'Preview impact'}
            </button>
            {preview ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-black text-slate-950">Preview</p>
                <p className="mt-1 text-slate-600">{preview.successCount} eligible, {preview.failedCount} skipped.</p>
                <p className={`mt-2 text-xs font-black ${preview.approval_required ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {preview.approval_required ? 'Approval required before execution.' : `${preview.rollback_minutes} minute rollback window after execution.`}
                </p>
              </div>
            ) : null}
          </div>
          {error ? <Panel tone="danger">{error}</Panel> : null}
          {message ? <Panel tone="success">{message}</Panel> : null}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Recent batches</h2>
            <div className="mt-4 space-y-3">
              {batches.slice(0, 8).map((batch) => {
                const canRollback = batch.status === 'completed' && !batch.rolled_back_at && batch.rollback_until && new Date(batch.rollback_until).getTime() > currentTime
                return (
                <div key={batch.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{batch.action_type}</p>
                      <p className="mt-1 text-slate-500">{batch.success_count}/{batch.target_count} succeeded - {batch.status}</p>
                    </div>
                    {canRollback ? (
                      <button onClick={() => rollback(batch.id)} disabled={rollingBackId === batch.id} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-50" title="Rollback batch">
                        <RotateCcw className={`h-4 w-4 ${rollingBackId === batch.id ? 'animate-spin' : ''}`} />
                      </button>
                    ) : null}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function Panel({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const styles = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
  return <div className={`rounded-3xl border p-6 text-sm shadow-sm ${styles}`}>{children}</div>
}
