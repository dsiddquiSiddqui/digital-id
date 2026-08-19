const SAFE_EXTENSION = /^\.[a-z0-9]{1,10}$/

export type UploadCategory = 'branding' | 'files'

export function getUploadCategory(requestedName: string): UploadCategory {
  const normalized = requestedName.replace(/\\/g, '/').toLowerCase()
  return normalized.startsWith('branding/') ? 'branding' : 'files'
}

export function buildTenantUploadPath(
  organizationId: string,
  requestedName: string,
  uploadId: string,
) {
  const normalized = requestedName.replace(/\\/g, '/')
  const originalName = normalized.split('/').filter(Boolean).at(-1) || 'upload'
  const extensionMatch = originalName.toLowerCase().match(/\.[a-z0-9]{1,10}$/)
  const extension = extensionMatch && SAFE_EXTENSION.test(extensionMatch[0])
    ? extensionMatch[0]
    : ''
  const stem = originalName
    .slice(0, extension ? -extension.length : undefined)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'upload'
  const safeUploadId = uploadId.toLowerCase().replace(/[^a-z0-9-]/g, '')
  const category = getUploadCategory(requestedName)

  return `organizations/${organizationId}/${category}/${safeUploadId}-${stem}${extension}`
}
