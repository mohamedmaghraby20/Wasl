import { expect, test } from '@playwright/test';

test('renders the public starting page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find your people in Türkiye' })).toBeVisible();
});

test('keeps navigation usable at a mobile viewport and switches to RTL for Arabic', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', { name: 'فتح قائمة التنقل' }).click();
  await expect(page.getByRole('link', { name: 'المجتمعات', exact: true })).toBeVisible();
  expect(
    await page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
