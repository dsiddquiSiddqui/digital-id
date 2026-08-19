const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3010'

const checks = [
  { name: 'homepage', path: '/', status: 200 },
  { name: 'login', path: '/login', status: 200 },
  { name: 'signup', path: '/signup', status: 200 },
  { name: 'staff login', path: '/staff-login', status: 200 },
  { name: 'invalid verification token', path: '/verify/sample', status: 404, maxMs: 1500 },
  { name: 'forbidden', path: '/forbidden', status: 200 },
  { name: 'session expired', path: '/session-expired', status: 200 },
  { name: 'billing failed', path: '/billing-failed', status: 200 },
]

let failed = 0

for (const { name, path, status, maxMs = 5000 } of checks) {
  const started = Date.now()
  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: 'manual',
      signal: AbortSignal.timeout(maxMs + 1000),
    })
    const duration = Date.now() - started
    const ok = response.status === status && duration <= maxMs
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} expected=${status} actual=${response.status} ${duration}ms/${maxMs}ms`)
    if (!ok) failed += 1
  } catch (error) {
    failed += 1
    console.log(`FAIL ${name} ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

process.exitCode = failed ? 1 : 0
