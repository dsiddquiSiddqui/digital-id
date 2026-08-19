import { expect, test } from '@playwright/test'

test('admin login fields have accessible names and usable controls', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeEditable()
  await expect(page.getByLabel('Password')).toBeEditable()
  await expect(page.getByRole('button', { name: /login to dashboard/i })).toBeEnabled()
})

test('signup fields are associated with visible labels', async ({ page }) => {
  await page.goto('/signup')

  await expect(page.getByLabel('Organization')).toBeEditable()
  await expect(page.getByLabel('Owner email')).toBeEditable()
  await expect(page.getByLabel('Password')).toBeEditable()
})

test('malformed verification tokens return a fast real 404', async ({ page }) => {
  await page.request.get('/verify/warmup')
  const started = Date.now()
  const response = await page.goto('/verify/sample')
  const elapsed = Date.now() - started

  expect(response?.status()).toBe(404)
  expect(elapsed).toBeLessThan(2500)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})
