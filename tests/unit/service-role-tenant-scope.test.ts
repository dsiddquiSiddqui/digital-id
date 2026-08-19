import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory()
      ? routeFiles(path)
      : entry.name === 'route.ts'
        ? [path]
        : []
  })
}

describe('service-role API tenant isolation', () => {
  it('requires every service-role route to declare an organization boundary', () => {
    const apiRoot = join(process.cwd(), 'src', 'app', 'api')
    const unscopedRoutes = routeFiles(apiRoot).filter((path) => {
      const source = readFileSync(path, 'utf8')
      return source.includes('createAdminClient') && !source.includes('organization_id')
    })

    expect(unscopedRoutes).toEqual([])
  })

  it.each([
    'src/app/api/admin/update-user/route.ts',
    'src/app/api/admin/reset-user-password/route.ts',
    'src/app/api/admin/toggle-user-status/route.ts',
    'src/app/api/admin/update-staff/route.ts',
    'src/app/api/admin/update-staff-status/route.ts',
    'src/app/api/admin/update-staff-id/route.ts',
    'src/app/api/admin/reset-staff-password/route.ts',
  ])('scopes sensitive target mutations in %s', (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
    expect(source).toContain(".eq('organization_id', currentProfile.organization_id)")
  })
})
