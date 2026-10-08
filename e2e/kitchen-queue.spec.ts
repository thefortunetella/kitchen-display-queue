import { expect, test } from '@playwright/test'

const API_URL = 'http://localhost:4000'
const AUTO_REFRESH_TIMEOUT = 30_000

// Seeded by `npm run db:setup` (run before the suite): the highest-ranked received order.
const SEEDED_CUSTOMER = 'Alice Morgan'

test('the expeditor starts a seeded order and its status changes on screen', async ({ page }) => {
  await page.goto('/')

  const row = page.getByRole('row').filter({ hasText: SEEDED_CUSTOMER })
  await expect(row.getByLabel('Status: Received')).toBeVisible()
  await expect(row.getByText('Next up')).toBeVisible()

  await row.getByRole('button', { name: /^Start preparing/ }).click()

  await expect(row.getByLabel('Status: Preparing')).toBeVisible()
  await expect(row.getByRole('button', { name: /^Mark ready/ })).toBeVisible()
  await expect(row.getByRole('button', { name: /^Cancel order/ })).toHaveCount(0)
})

test('an order created through the API appears on the open screen', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.getByRole('table', { name: 'Kitchen queue' })).toBeVisible()

  const customerName = `Walk-in ${Date.now().toString(36)}`
  const response = await request.post(`${API_URL}/orders`, {
    data: {
      customer_name: customerName,
      type: 'takeout',
      is_vip: false,
      promised_at: null,
      items: [{ menu_item_id: 1, quantity: 1 }],
    },
  })
  expect(response.status()).toBe(201)

  const row = page.getByRole('row').filter({ hasText: customerName })
  await expect(row).toBeVisible({ timeout: AUTO_REFRESH_TIMEOUT })
  await expect(row.getByLabel('Status: Received')).toBeVisible()
})
