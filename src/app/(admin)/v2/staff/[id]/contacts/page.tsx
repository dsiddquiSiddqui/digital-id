'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Phone, Plus, Trash2, TriangleAlert } from 'lucide-react'

type StaffSummary = {
  id: string
  full_name: string
  employee_code: string
}

type EmergencyContact = {
  id: string
  staff_id: string
  name: string
  relationship: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
}

export default function V2StaffContactsPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [staff, setStaff] = useState<StaffSummary | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])

  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [staffRes, contactsRes] = await Promise.all([
        fetch(`/api/v2/staff/${id}`),
        fetch(`/api/v2/staff/${id}/contacts`),
      ])

      const staffJson = await staffRes.json()
      const contactsJson = await contactsRes.json()

      if (!staffRes.ok) {
        setError(staffJson.error || 'Failed to load staff member.')
        setLoading(false)
        return
      }

      setStaff(staffJson.staff)
      setContacts(contactsRes.ok ? contactsJson.contacts || [] : [])
    } catch {
      setError('Something went wrong while loading contacts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (!name.trim()) {
      setError('Contact name is required.')
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`/api/v2/staff/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          relationship: relationship.trim() || null,
          phone: phone.trim() || null,
          email: email.trim().toLowerCase() || null,
          is_primary: isPrimary,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save contact.')
        setSaving(false)
        return
      }

      setSuccess('Emergency contact added successfully.')
      setName('')
      setRelationship('')
      setPhone('')
      setEmail('')
      setIsPrimary(false)

      await loadData()
    } catch {
      setError('Something went wrong while saving the contact.')
    } finally {
      setSaving(false)
    }
  }

  const handleSetPrimary = async (contactId: string) => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/v2/staff/${id}/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          is_primary: true,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update primary contact.')
        return
      }

      setSuccess('Primary contact updated successfully.')
      await loadData()
    } catch {
      setError('Something went wrong while updating the contact.')
    }
  }

  const handleDelete = async (contactId: string) => {
    setDeletingId(contactId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/v2/staff/${id}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to delete contact.')
        setDeletingId(null)
        return
      }

      setSuccess('Contact deleted successfully.')
      await loadData()
    } catch {
      setError('Something went wrong while deleting the contact.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading contacts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <TriangleAlert className="h-6 w-6 text-slate-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Emergency Contacts
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {staff ? `${staff.full_name} (${staff.employee_code})` : 'Manage emergency contacts'}
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Current Contacts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add and manage emergency contacts for this staff member.
            </p>
          </div>

          {contacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No emergency contacts added yet.
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                        {contact.is_primary ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            Primary
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm text-slate-600">
                        Relationship: {contact.relationship || '—'}
                      </p>

                      <div className="space-y-1 text-sm text-slate-600">
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {contact.phone || 'No phone'}
                        </p>
                        <p>{contact.email || 'No email'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!contact.is_primary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(contact.id)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Make Primary
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id)}
                        disabled={deletingId === contact.id}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === contact.id ? 'Deleting...' : 'Delete'}
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
            <h2 className="text-lg font-semibold text-slate-900">Add Contact</h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Contact full name"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Relationship
              </label>
              <input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Brother / Sister / Parent / Spouse"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="+44 7700 900000"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="contact@email.com"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-300 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Primary Contact</p>
                <p className="text-xs text-slate-500">Mark this contact as the main emergency contact.</p>
              </div>
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-5 w-5"
              />
            </div>

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

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Contact'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}