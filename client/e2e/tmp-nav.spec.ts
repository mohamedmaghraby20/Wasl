import { expect, test } from '@playwright/test';

test('minimal navbar and search opens discover', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/cities'))
      return route.fulfill({ json: [{ id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' }] });
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/interests'))
      return route.fulfill({ json: [] });
    return route.fulfill({ json: { items: [], page: 1, pageSize: 4, total: 0, hasMore: false } });
  });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 1 }) },
    });
  });
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('http://localhost:5173/');
  await expect(page.getByRole('link', { name: 'Wasl', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Discover', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/nav-minimal.png' });

  await page.getByRole('searchbox', { name: 'Search communities and events' }).fill('music');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?q=music/);
});
