import { describe, expect, it } from 'vitest'
import { buildTenantUploadPath, getUploadCategory } from '../../src/lib/storage-path'

describe('tenant upload paths', () => {
  it('keeps uploads inside the organization namespace', () => {
    expect(
      buildTenantUploadPath('org-123', '../../other-org/Secret File.PDF', 'UPLOAD-1'),
    ).toBe('organizations/org-123/files/upload-1-secret-file.pdf')
  })

  it('preserves the branding category without trusting nested path segments', () => {
    expect(
      buildTenantUploadPath('org-123', 'branding/acme/Logo Final.svg', 'asset-2'),
    ).toBe('organizations/org-123/branding/asset-2-logo-final.svg')
  })

  it('does not treat traversal prefixes as branding uploads', () => {
    expect(getUploadCategory('../branding/logo.svg')).toBe('files')
  })
})
