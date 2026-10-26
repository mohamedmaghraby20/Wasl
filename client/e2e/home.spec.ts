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

  const menuButton = page.getByRole('button', { name: 'Open navigation' });
  const menuBox = await menuButton.boundingBox();
  expect(menuBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(menuBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await menuButton.click();
  const closeButton = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close navigation' });
  const closeBox = await closeButton.boundingBox();
  expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const headingStyles = await page.locator('h1').first().evaluate((element) => {
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = style.lineHeight.endsWith('px')
      ? Number.parseFloat(style.lineHeight) / fontSize
      : Number.parseFloat(style.lineHeight);
    return { fontFamily: style.fontFamily, letterSpacing: style.letterSpacing, lineHeight };
  });
  expect(headingStyles.fontFamily).toContain('Tajawal');
  expect(['0px', 'normal']).toContain(headingStyles.letterSpacing);
  expect(headingStyles.lineHeight).toBeCloseTo(1.35, 1);
  await page.getByRole('button', { name: 'فتح قائمة التنقل' }).click();
  await expect(page.getByRole('link', { name: 'المجتمعات', exact: true })).toBeVisible();
  expect(
    await page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
