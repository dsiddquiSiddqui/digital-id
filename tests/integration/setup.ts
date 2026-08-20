import { spawn, type ChildProcess } from 'node:child_process'

const baseUrl = 'http://127.0.0.1:3101'
const warmupPaths = ['/', '/login', '/signup', '/staff-login', '/verify/sample']
let server: ChildProcess | undefined

async function isReady() {
  try {
    const response = await fetch(`${baseUrl}/digital-id-x-icon.svg`, { signal: AbortSignal.timeout(1000) })
    return response.status === 200
  } catch {
    return false
  }
}

async function warmPublicRoutes() {
  await Promise.all(
    warmupPaths.map(async (path) => {
      const response = await fetch(`${baseUrl}${path}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(60_000),
      })

      if (response.status >= 500) {
        throw new Error(`Integration warmup failed for ${path} with status ${response.status}.`)
      }
    }),
  )
}

export async function setup() {
  process.env.TEST_BASE_URL = baseUrl
  if (await isReady()) {
    await warmPublicRoutes()
    return
  }

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3101'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
    },
    stdio: 'ignore',
  })

  const deadline = Date.now() + 55_000
  while (Date.now() < deadline) {
    if (await isReady()) {
      await warmPublicRoutes()
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Integration test server did not become ready on port 3101.')
}

export async function teardown() {
  server?.kill()
}
