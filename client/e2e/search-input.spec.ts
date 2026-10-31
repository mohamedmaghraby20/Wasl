import { expect, test, type Page } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/reference/cities')
      ? [{ id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' }]
      : path.endsWith('/reference/categories')
        ? []
        : { items: [], page: 1, pageSize: 12, total: 0, hasMore: false };
    await route.fulfill({ json: data });
  });
}

test('search has one stable frame for idle, hover, input focus, and clear focus', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  const input = page.getByRole('searchbox');
  const frame = page.locator('.search-field');
  const initialBox = await frame.boundingBox();
  const idle = await frame.evaluate((element) => getComputedStyle(element).boxShadow);
  await input.hover();
  await expect
    .poll(() => frame.evaluate((element) => getComputedStyle(element).boxShadow))
    .not.toBe(idle);
  const hover = await frame.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(hover).not.toBe(idle);
  await input.click();
  await expect(frame).toHaveCSS('box-shadow', /2px inset/);
  const focused = await frame.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(focused).toContain('2px');
  expect(focused).not.toBe(hover);
  await expect(input).toHaveCSS('outline-style', 'none');
  await expect(input).toHaveCSS('box-shadow', 'none');
  await input.fill('music');
  await page.keyboard.press('Tab');
  const clear = page.getByRole('button', { name: 'Clear search' });
  await expect(clear).toBeFocused();
  await expect(clear).toHaveCSS('outline-offset', '-4px');
  expect(await frame.evaluate((element) => getComputedStyle(element).boxShadow)).toBe(focused);
  expect(await frame.boundingBox()).toEqual(initialBox);
  await page.screenshot({ path: test.info().outputPath('search-desktop-focus.png') });
  await clear.click();
  await expect(input).toBeEmpty();
  await expect(input).toBeFocused();
  await input.fill('music');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/discover\?q=music/);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page).not.toHaveURL(/[?&]q=/);
  await expect(page.getByRole('searchbox')).toBeFocused();
});

test('mobile RTL dark search and city picker keep focus inside a single frame', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('wasl-language', 'ar'));
  await mockApi(page);
  await page.goto('/discover');
  await page.evaluate(() => {
    document.documentElement.dataset.mode = 'dark';
  });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const input = page.getByRole('searchbox');
  await input.fill('موسيقى');
  await expect(input).toHaveCSS('font-size', '16px');
  const clear = page.locator('.search-field-clear');
  const clearBox = await clear.boundingBox();
  expect(clearBox!.width).toBeGreaterThanOrEqual(44);
  expect(clearBox!.height).toBeGreaterThanOrEqual(44);
  const frameBox = await page.locator('.search-field').boundingBox();
  expect(clearBox!.x).toBe(frameBox!.x);
  expect(frameBox!.x + frameBox!.width).toBeLessThanOrEqual(375);
  await page.screenshot({ path: test.info().outputPath('search-mobile-rtl-dark.png') });
  await clear.click();
  await expect(input).toBeFocused();

  await page.locator('#discovery-city').click();
  const citySearch = page.getByRole('combobox');
  await expect(citySearch).toBeFocused();
  await citySearch.fill('أنق');
  await expect(page.getByRole('option', { name: 'أنقرة' })).toBeVisible();
  await expect(citySearch).toHaveCSS('outline-style', 'none');
  await page.screenshot({ path: test.info().outputPath('search-city-rtl-dark.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).not.toBeVisible();
  await context.close();
});

test('disabled, invalid, and high-contrast search states stay distinguishable', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  const input = page.getByRole('searchbox');
  const frame = page.locator('.search-field');
  await input.evaluate((element: HTMLInputElement) => {
    element.disabled = true;
  });
  await expect(frame).toHaveCSS('opacity', '0.52');
  const disabled = await frame.evaluate((element) => getComputedStyle(element).boxShadow);
  await input.hover({ force: true });
  expect(await frame.evaluate((element) => getComputedStyle(element).boxShadow)).toBe(disabled);
  await input.evaluate((element: HTMLInputElement) => {
    element.disabled = false;
    element.setAttribute('aria-invalid', 'true');
  });
  await expect(frame).toHaveCSS('opacity', '1');
  await input.focus();
  await expect(frame).toHaveCSS('box-shadow', /2px inset/);
  expect(await frame.evaluate((element) => getComputedStyle(element).boxShadow)).toContain(
    '181, 58, 50',
  );
  await input.evaluate((element) => element.removeAttribute('aria-invalid'));
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(frame).toHaveCSS('outline-style', 'solid');
  await expect(frame).toHaveCSS('outline-width', '2px');
  await expect(frame).toHaveCSS('outline-offset', '-2px');
});
