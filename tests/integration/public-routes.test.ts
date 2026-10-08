import { describe, expect, it } from 'vitest'

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3101'

describe('public application routes', () => {
  it.each([
    ['homepage', '/', 200],
    ['login', '/login', 200],
    ['signup', '/signup', 200],
    ['staff login redirect', '/staff-login', 307],
    ['invalid verification token', '/verify/sample', 404],
  ])('returns the exact status for %s', async (_name, path, expectedStatus) => {
    const response = await fetch(new URL(path, baseUrl), { redirect: 'manual' })
    expect(response.status).toBe(expectedStatus)
  })

  it('server-renders explicit login label associations', async () => {
    const html = await fetch(new URL('/login', baseUrl)).then((response) => response.text())
    expect(html).toContain('for="login-email"')
    expect(html).toContain('id="login-email"')
    expect(html).toContain('for="login-password"')
    expect(html).toContain('id="login-password"')
  })

  it('rejects malformed verification tokens without a database round-trip', async () => {
    const started = performance.now()
    const response = await fetch(new URL('/verify/sample', baseUrl))
    const elapsed = performance.now() - started
    expect(response.status).toBe(404)
    expect(elapsed).toBeLessThan(2000)
  })
})
