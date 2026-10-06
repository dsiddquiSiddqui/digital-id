import { spawnSync } from 'node:child_process'
import Stripe from 'stripe'

const appUrl = (process.argv[2] || '').replace(/\/$/, '')
const rotateWebhook = process.argv.includes('--rotate-webhook')
const secretKey = process.env.STRIPE_SECRET_KEY

if (!appUrl || !URL.canParse(appUrl)) {
  throw new Error('Pass the deployed application URL as the first argument.')
}

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured.')
}

const stripe = new Stripe(secretKey, { typescript: true })
const plans = [
  { key: 'free', name: 'Free', amount: 0, env: 'STRIPE_FREE_PRICE_ID' },
  { key: 'starter', name: 'Starter', amount: 4_900, env: 'STRIPE_STARTER_PRICE_ID' },
  { key: 'growth', name: 'Growth', amount: 14_900, env: 'STRIPE_GROWTH_PRICE_ID' },
  { key: 'scale', name: 'Scale', amount: 39_900, env: 'STRIPE_SCALE_PRICE_ID' },
]

async function ensureProduct(plan) {
  const products = await stripe.products.search({
    query: `active:'true' AND metadata['app']:'security-id-system' AND metadata['plan']:'${plan.key}'`,
  })

  return products.data[0] ?? stripe.products.create({
    name: `${plan.name} plan`,
    metadata: { app: 'security-id-system', plan: plan.key },
  })
}

async function ensurePrice(plan, product) {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
  const existing = prices.data.find((price) =>
    price.currency === 'gbp' &&
    price.unit_amount === plan.amount &&
    price.recurring?.interval === 'month'
  )

  return existing ?? stripe.prices.create({
    product: product.id,
    currency: 'gbp',
    unit_amount: plan.amount,
    recurring: { interval: 'month' },
    metadata: { app: 'security-id-system', plan: plan.key },
  })
}

function setVercelEnv(name, value, { sensitive = false } = {}) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const args = [
    'vercel', 'env', 'add', name, 'production,preview,development',
    '--force', '--yes', sensitive ? '--sensitive' : '--no-sensitive',
  ]
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    input: value,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['pipe', 'inherit', 'inherit'],
  })

  if (result.status !== 0) {
    throw new Error(`Unable to configure ${name} in Vercel: ${result.error?.message || `exit ${result.status}`}`)
  }
}

const productsByPlan = {}
const priceIds = {}
for (const plan of plans) {
  const product = await ensureProduct(plan)
  const price = await ensurePrice(plan, product)
  productsByPlan[plan.key] = product.id
  priceIds[plan.env] = price.id
}

const webhookUrl = `${appUrl}/api/billing/webhook`
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
let webhook = endpoints.data.find((endpoint) => endpoint.url === webhookUrl)
let webhookSecret

if (webhook) {
  if (process.env.STRIPE_WEBHOOK_SECRET && !rotateWebhook) {
    webhook = await stripe.webhookEndpoints.update(webhook.id, {
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
      ],
    })
  } else {
    await stripe.webhookEndpoints.del(webhook.id)
    webhook = undefined
  }
}

if (!webhook) {
  webhook = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    description: 'Security ID System subscription lifecycle',
    enabled_events: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ],
  })
  webhookSecret = webhook.secret
}

const portalConfiguration = {
  business_profile: { headline: 'Manage your Security ID System subscription' },
  features: {
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: 'at_period_end' },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'],
      products: plans.map((plan) => ({
        product: productsByPlan[plan.key],
        prices: [priceIds[plan.env]],
      })),
    },
  },
}
const portalConfigurations = await stripe.billingPortal.configurations.list({ limit: 100 })
const defaultPortalConfiguration = portalConfigurations.data.find((configuration) => configuration.is_default)
if (defaultPortalConfiguration) {
  await stripe.billingPortal.configurations.update(defaultPortalConfiguration.id, portalConfiguration)
} else {
  await stripe.billingPortal.configurations.create(portalConfiguration)
}

if (webhookSecret) {
  setVercelEnv('STRIPE_WEBHOOK_SECRET', webhookSecret, { sensitive: true })
} else if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('The webhook already exists, but its signing secret is unavailable. Rotate it in Stripe and set STRIPE_WEBHOOK_SECRET.')
}

for (const [name, value] of Object.entries(priceIds)) {
  setVercelEnv(name, value)
}

setVercelEnv('NEXT_PUBLIC_APP_URL', appUrl)

console.log(`Stripe configured with ${plans.length} monthly GBP prices and webhook ${webhook.id}.`)
