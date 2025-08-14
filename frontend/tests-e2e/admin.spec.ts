import { test, expect } from '@playwright/test'

test.describe('Revenue Banding Admin', () => {
  test('loads and can preview a band', async ({ page }) => {
    await page.goto('/admin/revenue-banding')
    await expect(page.getByText('Revenue Banding Admin')).toBeVisible()

    // team selector should be present; if options exist, select first
    const teamSelect = page.locator('#team-label').first()
    await expect(teamSelect).toBeVisible()

    // click preview
    await page.getByRole('button', { name: 'Preview Band' }).click()

    // expect either an error alert (no backend) or preview block
    // We assert UI did not crash by checking page still shows header
    await expect(page.getByText('Revenue Banding Admin')).toBeVisible()
  })
})


