'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import IdCard from '@/components/IdCard'
import {
  BadgeCheck,
  Download,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LogOut,
  Shield,
  UserCircle2,
} from 'lucide-react'

type Profile = {
  id: string
  auth_user_id: string
  role: string
  full_name: string | null
  email: string | null
  is_active: boolean | null
}

type Staff = {
  id: string
  profile_id: string
  full_name: string
  employee_code: string | null
  photo_url: string | null
}

type StaffId = {
  id: string
  staff_id: string
  role_title: string | null
  id_number: string
  qr_token: string | null
  issue_date: string | null
  expiry_date: string | null
  status: string | null
  is_current: boolean | null
}

type StaffDocument = {
  id: string
  staff_id: string
  document_type_id: string | null
  document_number: string | null
  issue_date: string | null
  expiry_date: string | null
  status: string | null
  verified: boolean | null
  verified_by: string | null
  verified_at: string | null
  file_url: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  custom_document_name: string | null
  custom_document_code: string | null
  has_expiry: boolean | null
  document_types: {
    name: string | null
  } | null
}

type TabKey = 'id' | 'documents' | 'password'

export default function MyIdPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [staffId, setStaffId] = useState<StaffId | null>(null)
  const [documents, setDocuments] = useState<StaffDocument[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('id')

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/staff-login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, auth_user_id, role, full_name, email, is_active')
        .eq('auth_user_id', user.id)
        .single()

      console.log('profileData:', profileData)
      console.log('profileError:', profileError)

      if (profileError || !profileData) {
        await supabase.auth.signOut()
        router.push('/staff-login')
        return
      }

      if (profileData.role !== 'staff') {
        await supabase.auth.signOut()
        router.push('/')
        return
      }

      if (!profileData.is_active) {
        await supabase.auth.signOut()
        router.push('/staff-login')
        return
      }

      setProfile(profileData)

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, profile_id, full_name, employee_code, photo_url')
        .eq('profile_id', profileData.id)
        .single()

      console.log('staffData:', staffData)
      console.log('staffError:', staffError)

      if (staffError || !staffData) {
        setLoading(false)
        return
      }

      setStaff(staffData)

      const { data: idData, error: idError } = await supabase
        .from('staff_ids')
        .select(
          'id, staff_id, role_title, id_number, qr_token, issue_date, expiry_date, status, is_current'
        )
        .eq('staff_id', staffData.id)
        .eq('is_current', true)
        .maybeSingle()

      console.log('idData:', idData)
      console.log('idError:', idError)

      setStaffId(idData ?? null)

      const { data: docsRaw, error: docsError } = await supabase
        .from('staff_documents')
        .select(`
          id,
          staff_id,
          document_type_id,
          document_number,
          issue_date,
          expiry_date,
          status,
          verified,
          verified_by,
          verified_at,
          file_url,
          notes,
          created_at,
          updated_at,
          custom_document_name,
          custom_document_code,
          has_expiry
        `)
        .eq('staff_id', staffData.id)
        .order('created_at', { ascending: false })

      console.log('staffData.id:', staffData.id)
      console.log('docsRaw:', docsRaw)
      console.log('docsError:', docsError)

      let documentTypeMap: Record<string, string> = {}

      const typeIds = [
        ...new Set(
          (docsRaw || [])
            .map((doc: any) => doc.document_type_id)
            .filter(Boolean)
        ),
      ] as string[]

      if (typeIds.length > 0) {
        const { data: typeRows, error: typeError } = await supabase
          .from('document_types')
          .select('id, name')
          .in('id', typeIds)

        console.log('typeRows:', typeRows)
        console.log('typeError:', typeError)

        documentTypeMap =
          typeRows?.reduce((acc: Record<string, string>, row: any) => {
            acc[row.id] = row.name
            return acc
          }, {}) || {}
      }

      const docsFormatted: StaffDocument[] = (docsRaw || []).map((doc: any) => ({
        ...doc,
        document_types: doc.document_type_id
          ? { name: documentTypeMap[doc.document_type_id] || null }
          : null,
      }))

      const validDocs = docsFormatted.filter(
  (doc) => doc.status?.toLowerCase() === 'valid'
)

setDocuments(validDocs)
      setLoading(false)
    }

    load()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/staff-login')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    const newPassword = passwordForm.newPassword.trim()
    const confirmPassword = passwordForm.confirmPassword.trim()

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in both password fields.')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setPasswordError(error.message)
      setPasswordLoading(false)
      return
    }

    setPasswordMessage('Your password has been updated successfully.')
    setPasswordForm({
      newPassword: '',
      confirmPassword: '',
    })
    setPasswordLoading(false)
  }

  const staffDisplayName = useMemo(() => {
    return staff?.full_name || profile?.full_name || 'Staff User'
  }, [staff?.full_name, profile?.full_name])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">Loading your staff portal...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-[#081a33] to-[#0f274a] p-6 text-white shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
             <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white/10">
  {staff?.photo_url ? (
    <img
      src={staff.photo_url}
      alt={staff.full_name}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <UserCircle2 className="h-8 w-8 text-white" />
    </div>
  )}
</div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-200">
                  Staff Portal
                </p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                  Welcome, {staffDisplayName}
                </h1>
                <p className="mt-2 text-sm text-white/75">
                  Manage your digital ID, documents, and account password.
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<BadgeCheck className="h-5 w-5 text-[#0094e0]" />}
            title="Digital ID"
            value={staffId ? 'Assigned' : 'Not assigned'}
            subtitle={staffId?.id_number ? `ID: ${staffId.id_number}` : 'No current ID'}
          />
          <SummaryCard
            icon={<FileText className="h-5 w-5 text-emerald-600" />}
            title="Documents"
            value={`${documents.length}`}
            subtitle={
              documents.length === 1
                ? '1 document found'
                : `${documents.length} documents found`
            }
          />
          <SummaryCard
            icon={<Shield className="h-5 w-5 text-amber-600" />}
            title="Account"
            value={profile?.email || 'Staff account'}
            subtitle="Password can be updated here"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <TabButton
            active={activeTab === 'id'}
            onClick={() => setActiveTab('id')}
            icon={<BadgeCheck className="h-4 w-4" />}
            label="My Digital ID"
          />
          <TabButton
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
            icon={<FileText className="h-4 w-4" />}
            label="My Documents"
          />
          <TabButton
            active={activeTab === 'password'}
            onClick={() => setActiveTab('password')}
            icon={<KeyRound className="h-4 w-4" />}
            label="Change Password"
          />
        </div>

        {activeTab === 'id' && (
          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">My Digital ID</h2>
              <p className="mt-1 text-sm text-slate-500">
                View your currently assigned staff digital ID.
              </p>
            </div>

            {!staff || !staffId ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-base font-medium text-slate-700">No digital ID assigned.</p>
                <p className="mt-2 text-sm text-slate-500">
                  Please contact your admin if you believe this is incorrect.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <IdCard
                  fullName={staff.full_name}
                  employeeCode={staff.employee_code ?? 'N/A'}
                  roleTitle={staffId.role_title ?? 'Staff'}
                  idNumber={staffId.id_number}
                  qrToken={staffId.qr_token ?? ''}
                  photoUrl={staff.photo_url ?? ''}
                  issueDate={staffId.issue_date ?? ''}
                  expiryDate={staffId.expiry_date ?? ''}
                  idStatus={staffId.status ?? 'active'}
                />
              </div>
            )}
          </section>
        )}

        {activeTab === 'documents' && (
          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">My Documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                View your uploaded staff documents.
              </p>
            </div>

            {!staff ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                Staff profile not found.
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-base font-medium text-slate-700">No documents found.</p>
                <p className="mt-2 text-sm text-slate-500">
                  Your documents will appear here once uploaded by admin.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {documents.map((doc) => {
                  const docName =
                    doc.custom_document_name ||
                    doc.document_types?.name ||
                    doc.custom_document_code ||
                    doc.document_number ||
                    'Document'

                  return (
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="rounded-xl bg-slate-100 p-2">
                              <FileText className="h-4 w-4 text-slate-700" />
                            </div>
                            <h3 className="truncate text-base font-semibold text-slate-900">
                              {docName}
                            </h3>
                          </div>

                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoItem
                              label="Document Number"
                              value={doc.document_number || '—'}
                            />
                            <InfoItem label="Status" value={doc.status || '—'} />
                            <InfoItem label="Issue Date" value={doc.issue_date || '—'} />
                            <InfoItem
                              label="Expiry Date"
                              value={doc.has_expiry ? doc.expiry_date || '—' : 'No expiry'}
                            />
                          </div>

                          {doc.notes ? (
                            <p className="mt-3 text-sm text-slate-500">{doc.notes}</p>
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          {doc.file_url ? (
                            <>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </a>

                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-[#0094e0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#007bb8]"
                              >
                                <Download className="h-4 w-4" />
                                Open File
                              </a>
                            </>
                          ) : (
                            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
                              No file attached
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'password' && (
          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update your staff login password securely.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="max-w-xl space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  New Password
                </label>
                <div className="flex items-center rounded-2xl border border-slate-200 px-4 shadow-sm focus-within:border-[#0094e0]">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter new password"
                    className="w-full bg-transparent px-3 py-3.5 text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm New Password
                </label>
                <div className="flex items-center rounded-2xl border border-slate-200 px-4 shadow-sm focus-within:border-[#0094e0]">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                    className="w-full bg-transparent px-3 py-3.5 text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {passwordError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {passwordError}
                </div>
              ) : null}

              {passwordMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {passwordMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-2xl bg-[#0094e0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#007bb8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="mt-1 text-lg font-bold text-slate-900">{value}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        active
          ? 'bg-[#0094e0] text-white shadow-sm'
          : 'bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}