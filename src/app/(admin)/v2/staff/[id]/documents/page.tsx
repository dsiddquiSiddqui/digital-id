'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  FileText,
  Upload,
  Plus,
  Trash2,
  Pencil,
  X,
} from 'lucide-react'

type StaffSummary = {
  id: string
  full_name: string
  employee_code: string
}

type DocumentType = {
  id: string
  code: string
  name: string
  has_expiry: boolean
}

type StaffDocument = {
  id: string
  staff_id: string
  document_type_id: string | null
  document_number: string | null
  issue_date: string | null
  expiry_date: string | null
  status: string
  file_url: string | null
  notes: string | null
  created_at: string
  custom_document_name?: string | null
  custom_document_code?: string | null
  has_expiry?: boolean | null
  show_on_staff_panel?: boolean
  document_types?: {
    id: string
    code: string
    name: string
    has_expiry: boolean
  } | null
}

const CUSTOM_DOCUMENT_VALUE = '__custom__'

type DocumentFormState = {
  documentTypeId: string
  customDocumentName: string
  customDocumentCode: string
  customHasExpiry: boolean
  documentNumber: string
  issueDate: string
  expiryDate: string
  status: string
  notes: string
  file: File | null
  existingFileUrl: string | null
  showOnStaffPanel: boolean
}

const getInitialFormState = (): DocumentFormState => ({
  documentTypeId: '',
  customDocumentName: '',
  customDocumentCode: '',
  customHasExpiry: false,
  documentNumber: '',
  issueDate: '',
  expiryDate: '',
  status: 'pending',
  notes: '',
  file: null,
  existingFileUrl: null,
  showOnStaffPanel: false,
})

async function readJsonSafely(response: Response) {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export default function V2StaffDocumentsPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [staff, setStaff] = useState<StaffSummary | null>(null)
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [documents, setDocuments] = useState<StaffDocument[]>([])

  const [addForm, setAddForm] = useState<DocumentFormState>(getInitialFormState())

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState<DocumentFormState>(getInitialFormState())

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [staffRes, docsRes, typesRes] = await Promise.all([
        fetch(`/api/v2/staff/${id}`),
        fetch(`/api/v2/staff/${id}/documents`),
        fetch(`/api/v2/document-types`),
      ])

      const staffJson = await readJsonSafely(staffRes)
      const docsJson = await readJsonSafely(docsRes)
      const typesJson = await readJsonSafely(typesRes)

      if (!staffRes.ok) {
        setError(staffJson?.error || 'Failed to load staff member.')
        setLoading(false)
        return
      }

      const loadedTypes = typesRes.ok ? typesJson?.document_types || [] : []

      setStaff(staffJson?.staff || null)
      setDocuments(docsRes.ok ? docsJson?.documents || [] : [])
      setDocumentTypes(loadedTypes)

      setAddForm((prev) => ({
        ...prev,
        documentTypeId: prev.documentTypeId || loadedTypes[0]?.id || '',
      }))
    } catch {
      setError('Something went wrong while loading documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const addIsCustomDocument = addForm.documentTypeId === CUSTOM_DOCUMENT_VALUE
  const addSelectedType = useMemo(
    () => documentTypes.find((type) => type.id === addForm.documentTypeId),
    [documentTypes, addForm.documentTypeId]
  )
  const addSelectedHasExpiry = addIsCustomDocument
    ? addForm.customHasExpiry
    : Boolean(addSelectedType?.has_expiry)

  const editIsCustomDocument = editForm.documentTypeId === CUSTOM_DOCUMENT_VALUE
  const editSelectedType = useMemo(
    () => documentTypes.find((type) => type.id === editForm.documentTypeId),
    [documentTypes, editForm.documentTypeId]
  )
  const editSelectedHasExpiry = editIsCustomDocument
    ? editForm.customHasExpiry
    : Boolean(editSelectedType?.has_expiry)

  const resetAddForm = () => {
    setAddForm({
      ...getInitialFormState(),
      documentTypeId: documentTypes[0]?.id || '',
    })
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingId(null)
    setEditForm(getInitialFormState())
  }

  const openEditModal = (doc: StaffDocument) => {
    setError('')
    setSuccess('')
    setEditingId(doc.id)

    const hasMappedType =
      !!doc.document_type_id &&
      documentTypes.some((t) => t.id === doc.document_type_id)

    if (hasMappedType) {
      setEditForm({
        documentTypeId: doc.document_type_id as string,
        customDocumentName: '',
        customDocumentCode: '',
        customHasExpiry: Boolean(doc.document_types?.has_expiry),
        documentNumber: doc.document_number || '',
        issueDate: doc.issue_date || '',
        expiryDate: doc.expiry_date || '',
        status: doc.status || 'pending',
        notes: doc.notes || '',
        file: null,
        existingFileUrl: doc.file_url || null,
        showOnStaffPanel: Boolean(doc.show_on_staff_panel),
      })
    } else {
      setEditForm({
        documentTypeId: CUSTOM_DOCUMENT_VALUE,
        customDocumentName: doc.custom_document_name || doc.document_types?.name || '',
        customDocumentCode: doc.custom_document_code || doc.document_types?.code || '',
        customHasExpiry: Boolean(doc.has_expiry ?? doc.document_types?.has_expiry),
        documentNumber: doc.document_number || '',
        issueDate: doc.issue_date || '',
        expiryDate: doc.expiry_date || '',
        status: doc.status || 'pending',
        notes: doc.notes || '',
        file: null,
        existingFileUrl: doc.file_url || null,
        showOnStaffPanel: Boolean(doc.show_on_staff_panel),
      })
    }

    setIsEditModalOpen(true)
  }

  const uploadSelectedFile = async (selectedFile: File) => {
    const fileName = `${Date.now()}-${selectedFile.name}`

    const uploadRes = await fetch('/api/admin/upload-photo', {
      method: 'POST',
      body: selectedFile,
      headers: {
        'x-filename': fileName,
      },
    })

    const uploadData = await readJsonSafely(uploadRes)

    if (!uploadRes.ok) {
      throw new Error(uploadData?.error || 'Failed to upload document file.')
    }

    return uploadData.url as string
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (!addForm.documentTypeId) {
      setError('Please select a document type.')
      setSaving(false)
      return
    }

    if (addIsCustomDocument && !addForm.customDocumentName.trim()) {
      setError('Please enter a custom document name.')
      setSaving(false)
      return
    }

    if (
      addSelectedHasExpiry &&
      addForm.expiryDate &&
      addForm.issueDate &&
      addForm.expiryDate <= addForm.issueDate
    ) {
      setError('Expiry date must be later than issue date.')
      setSaving(false)
      return
    }

    if (addForm.showOnStaffPanel && addForm.status !== 'valid') {
      setError('Only valid documents can be shown on the staff panel.')
      setSaving(false)
      return
    }

    let fileUrl: string | null = null

    try {
      if (addForm.file) {
        fileUrl = await uploadSelectedFile(addForm.file)
      }

      const response = await fetch(`/api/v2/staff/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type_id: addIsCustomDocument ? null : addForm.documentTypeId,
          custom_document_name: addIsCustomDocument ? addForm.customDocumentName.trim() : null,
          custom_document_code: addIsCustomDocument ? addForm.customDocumentCode.trim() || null : null,
          custom_has_expiry: addIsCustomDocument ? addForm.customHasExpiry : null,
          document_number: addForm.documentNumber.trim() || null,
          issue_date: addForm.issueDate || null,
          expiry_date: addSelectedHasExpiry ? addForm.expiryDate || null : null,
          status: addForm.status,
          file_url: fileUrl,
          notes: addForm.notes.trim() || null,
          show_on_staff_panel: addForm.showOnStaffPanel,
        }),
      })

      const result = await readJsonSafely(response)

      if (!response.ok) {
        setError(result?.error || 'Failed to create document.')
        setSaving(false)
        return
      }

      setSuccess('Document added successfully.')
      resetAddForm()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving the document.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingId) return

    setEditSaving(true)
    setError('')
    setSuccess('')

    if (!editForm.documentTypeId) {
      setError('Please select a document type.')
      setEditSaving(false)
      return
    }

    if (editIsCustomDocument && !editForm.customDocumentName.trim()) {
      setError('Please enter a custom document name.')
      setEditSaving(false)
      return
    }

    if (
      editSelectedHasExpiry &&
      editForm.expiryDate &&
      editForm.issueDate &&
      editForm.expiryDate <= editForm.issueDate
    ) {
      setError('Expiry date must be later than issue date.')
      setEditSaving(false)
      return
    }

    if (editForm.showOnStaffPanel && editForm.status !== 'valid') {
      setError('Only valid documents can be shown on the staff panel.')
      setEditSaving(false)
      return
    }

    let fileUrl: string | null = editForm.existingFileUrl

    try {
      if (editForm.file) {
        fileUrl = await uploadSelectedFile(editForm.file)
      }

      const response = await fetch(`/api/v2/staff/${id}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: editingId,
          document_type_id: editIsCustomDocument ? null : editForm.documentTypeId,
          custom_document_name: editIsCustomDocument ? editForm.customDocumentName.trim() : null,
          custom_document_code: editIsCustomDocument ? editForm.customDocumentCode.trim() || null : null,
          custom_has_expiry: editIsCustomDocument ? editForm.customHasExpiry : null,
          document_number: editForm.documentNumber.trim() || null,
          issue_date: editForm.issueDate || null,
          expiry_date: editSelectedHasExpiry ? editForm.expiryDate || null : null,
          status: editForm.status,
          file_url: fileUrl,
          notes: editForm.notes.trim() || null,
          show_on_staff_panel: editForm.showOnStaffPanel,
        }),
      })

      const result = await readJsonSafely(response)

      if (!response.ok) {
        setError(result?.error || 'Failed to update document.')
        setEditSaving(false)
        return
      }

      setSuccess('Document updated successfully.')
      closeEditModal()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while updating the document.'
      )
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/v2/staff/${id}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
        }),
      })

      const result = await readJsonSafely(response)

      if (!response.ok) {
        setError(result?.error || 'Failed to delete document.')
        setDeletingId(null)
        return
      }

      if (editingId === documentId) {
        closeEditModal()
      }

      setSuccess('Document deleted successfully.')
      await loadData()
    } catch {
      setError('Something went wrong while deleting the document.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading documents...</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-slate-100 p-3">
                <FileText className="h-6 w-6 text-slate-700" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Documents
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {staff
                    ? `${staff.full_name} (${staff.employee_code})`
                    : 'Manage staff documents'}
                </p>
              </div>
            </div>

            <Link
              href={`/v2/staff/${id}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Staff
            </Link>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Current Documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Uploaded and tracked documents for this staff member.
              </p>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No documents added yet.
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {doc.document_types?.name ||
                              doc.custom_document_name ||
                              'Document'}
                          </h3>
                          <DocumentStatusBadge status={doc.status} />
                          <VisibilityBadge show={Boolean(doc.show_on_staff_panel)} />
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                          <p>Number: {doc.document_number || '—'}</p>
                          <p>Issue Date: {doc.issue_date || '—'}</p>
                          <p>Expiry Date: {doc.expiry_date || '—'}</p>
                          <p>
                            Type Code:{' '}
                            {doc.document_types?.code || doc.custom_document_code || '—'}
                          </p>
                        </div>

                        {doc.notes ? (
                          <p className="text-sm text-slate-500">{doc.notes}</p>
                        ) : null}

                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#0094e0] hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            Open File
                          </a>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(doc)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-2">
                <Plus className="h-4 w-4 text-slate-700" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Add Document</h2>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Document Type *
                </label>
                <select
                  value={addForm.documentTypeId}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      documentTypeId: e.target.value,
                      customDocumentName:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.customDocumentName
                          : '',
                      customDocumentCode:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.customDocumentCode
                          : '',
                      customHasExpiry:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.customHasExpiry
                          : false,
                      expiryDate:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.expiryDate
                          : '',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                  <option value={CUSTOM_DOCUMENT_VALUE}>Other / Custom Document</option>
                </select>
              </div>

              {addIsCustomDocument ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Custom Document Name *
                    </label>
                    <input
                      value={addForm.customDocumentName}
                      onChange={(e) =>
                        setAddForm((prev) => ({
                          ...prev,
                          customDocumentName: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      placeholder="Example: Site Induction Form"
                      required={addIsCustomDocument}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Custom Document Code
                    </label>
                    <input
                      value={addForm.customDocumentCode}
                      onChange={(e) =>
                        setAddForm((prev) => ({
                          ...prev,
                          customDocumentCode: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      placeholder="Optional code"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={addForm.customHasExpiry}
                      onChange={(e) =>
                        setAddForm((prev) => ({
                          ...prev,
                          customHasExpiry: e.target.checked,
                          expiryDate: e.target.checked ? prev.expiryDate : '',
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-800">
                        This custom document has an expiry date
                      </span>
                      <span className="block text-xs text-slate-500">
                        Tick this if the document should track expiry.
                      </span>
                    </div>
                  </label>
                </>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Document Number
                </label>
                <input
                  value={addForm.documentNumber}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      documentNumber: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Optional document number"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={addForm.issueDate}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      issueDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              {addSelectedHasExpiry ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={addForm.expiryDate}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        expiryDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={addForm.status}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                      showOnStaffPanel:
                        e.target.value === 'valid' ? prev.showOnStaffPanel : false,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="pending">pending</option>
                  <option value="valid">valid</option>
                  <option value="expired">expired</option>
                  <option value="rejected">rejected</option>
                  <option value="missing">missing</option>
                </select>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={addForm.showOnStaffPanel}
                  disabled={addForm.status !== 'valid'}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      showOnStaffPanel: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-800">
                    Show on staff panel
                  </span>
                  <span className="block text-xs text-slate-500">
                    Only valid documents can be shown to staff users.
                  </span>
                </div>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  File Upload
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:bg-slate-100">
                  <Upload className="h-4 w-4" />
                  <span>{addForm.file ? addForm.file.name : 'Upload document file'}</span>
                  <input
                    type="file"
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        file: e.target.files?.[0] || null,
                      }))
                    }
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Optional notes..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Document'}
              </button>
            </form>
          </div>
        </section>
      </div>

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-2">
                  <Pencil className="h-4 w-4 text-slate-700" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Edit Document</h2>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Document Type *
                </label>
                <select
                  value={editForm.documentTypeId}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      documentTypeId: e.target.value,
                      customDocumentName:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.customDocumentName
                          : '',
                      customDocumentCode:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.customDocumentCode
                          : '',
                      customHasExpiry:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.customHasExpiry
                          : false,
                      expiryDate:
                        e.target.value === CUSTOM_DOCUMENT_VALUE
                          ? prev.expiryDate
                          : '',
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                  <option value={CUSTOM_DOCUMENT_VALUE}>Other / Custom Document</option>
                </select>
              </div>

              {editIsCustomDocument ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Custom Document Name *
                    </label>
                    <input
                      value={editForm.customDocumentName}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          customDocumentName: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      placeholder="Example: Site Induction Form"
                      required={editIsCustomDocument}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Custom Document Code
                    </label>
                    <input
                      value={editForm.customDocumentCode}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          customDocumentCode: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      placeholder="Optional code"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={editForm.customHasExpiry}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          customHasExpiry: e.target.checked,
                          expiryDate: e.target.checked ? prev.expiryDate : '',
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-800">
                        This custom document has an expiry date
                      </span>
                      <span className="block text-xs text-slate-500">
                        Tick this if the document should track expiry.
                      </span>
                    </div>
                  </label>
                </>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Document Number
                </label>
                <input
                  value={editForm.documentNumber}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      documentNumber: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Optional document number"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={editForm.issueDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      issueDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              {editSelectedHasExpiry ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        expiryDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                      showOnStaffPanel:
                        e.target.value === 'valid' ? prev.showOnStaffPanel : false,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="pending">pending</option>
                  <option value="valid">valid</option>
                  <option value="expired">expired</option>
                  <option value="rejected">rejected</option>
                  <option value="missing">missing</option>
                </select>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={editForm.showOnStaffPanel}
                  disabled={editForm.status !== 'valid'}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      showOnStaffPanel: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-800">
                    Show on staff panel
                  </span>
                  <span className="block text-xs text-slate-500">
                    Only valid documents can be shown to staff users.
                  </span>
                </div>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  File Upload
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:bg-slate-100">
                  <Upload className="h-4 w-4" />
                  <span>{editForm.file ? editForm.file.name : 'Upload document file'}</span>
                  <input
                    type="file"
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        file: e.target.files?.[0] || null,
                      }))
                    }
                    className="hidden"
                  />
                </label>

                {editForm.existingFileUrl && !editForm.file ? (
                  <a
                    href={editForm.existingFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#0094e0] hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    Open current file
                  </a>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {editSaving ? 'Updating...' : 'Update Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function DocumentStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase()

  if (normalized === 'valid') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        Valid
      </span>
    )
  }

  if (normalized === 'expired') {
    return (
      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
        Expired
      </span>
    )
  }

  if (normalized === 'rejected') {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        Rejected
      </span>
    )
  }

  if (normalized === 'missing') {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
        Missing
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      Pending
    </span>
  )
}

function VisibilityBadge({ show }: { show: boolean }) {
  if (show) {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
        Staff Visible
      </span>
    )
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      Hidden from Staff
    </span>
  )
}