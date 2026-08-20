import { spawn, spawnSync } from 'node:child_process'

const baseUrl = 'http://127.0.0.1:3102'
const testEnv = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
}

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3102'], {
  cwd: process.cwd(),
  env: testEnv,
  stdio: 'ignore',
})
server.unref()

async function waitForServer() {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/digital-id-x-icon.svg`, {
        signal: AbortSignal.timeout(1000),
      })
      if (response.ok) return
    } catch {
      // Continue until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Playwright server did not become ready on port 3102.')
}

function stopServer() {
  if (process.platform === 'win32' && server.pid) {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' })
  } else {
    server.kill('SIGTERM')
  }
}

try {
  await waitForServer()
  const tests = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
    cwd: process.cwd(),
    env: { ...testEnv, PLAYWRIGHT_EXTERNAL_SERVER: '1' },
    stdio: 'inherit',
  })
  const exitCode = await new Promise((resolve) => tests.once('exit', (code) => resolve(code ?? 1)))
  process.exitCode = Number(exitCode)
} finally {
  stopServer()
}
