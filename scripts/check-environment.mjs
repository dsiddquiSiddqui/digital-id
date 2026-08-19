import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const production = process.argv.includes('--production')

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'BILLING_PROVIDER',
  'EMAIL_PROVIDER',
  'CUSTOM_DOMAIN_TARGET',
  'CRON_SECRET',
  'ERROR_TRACKING_DSN',
]

const conditional = [
  ...(process.env.EMAIL_PROVIDER === 'resend' ? ['RESEND_API_KEY', 'EMAIL_FROM'] : []),
  ...(process.env.BILLING_PROVIDER && process.env.BILLING_PROVIDER !== 'manual'
    ? ['BILLING_CHECKOUT_URL', 'BILLING_WEBHOOK_SECRET']
    : []),
]

const missing = [...required, ...conditional].filter((name) => !process.env[name]?.trim())

if (production && process.env.BILLING_PROVIDER === 'manual') {
  missing.push('BILLING_PROVIDER (hosted provider required in production)')
}
if (production && process.env.EMAIL_PROVIDER === 'manual') {
  missing.push('EMAIL_PROVIDER (transactional provider required in production)')
}

if (missing.length === 0) {
  console.log('Environment check passed: all selected integrations are configured.')
} else {
  console.log(`Environment check ${production ? 'failed' : 'warning'}: missing ${missing.join(', ')}`)
  console.log('Copy .env.example to .env.local and provide real provider credentials.')
  if (production) process.exitCode = 1
}
