import { expect, test } from '@playwright/test';

for (const touch of [false, true]) {
  test.describe(touch ? 'touch icons' : 'desktop icons', () => {
    test.use({ hasTouch: touch, viewport: { width: touch ? 375 : 1280, height: 900 }, reducedMotion: 'reduce' });

    test('resource actions stay compact and expose semantic hover and keyboard feedback', async ({ page }) => {
      await page.route('**/api/v1/**', (route) => {
        const path = new URL(route.request().url()).pathname;
        const data = path.endsWith('/events/icon-event')
          ? { id: 'icon-event', slug: 'icon-event', title: 'Icon checks', description: 'A community gathering.', visibility: 'public', hostType: 'user', hostId: 'host', hostName: 'Host', online: true, startsAt: '2099-11-22T12:00:00Z', cancelled: false, admissionMode: 'instant', categories: [] }
          : { items: [], page: 1, pageSize: 20, total: 0, hasMore: false };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.goto('/events/icon-event');
      await expect(page.getByRole('heading', { name: 'Icon checks' })).toBeVisible();
      const share = page.getByRole('button', { name: 'Copy share link' });
      const report = page.getByRole('link', { name: 'Report', exact: true });
      for (const action of [share, report]) {
        await expect(action).toHaveAttribute('title');
        expect((await action.boundingBox())!.width).toBe(touch ? 44 : 36);
        await expect(action.locator('svg')).toHaveCSS('width', '16px');
        await expect(action.locator('svg')).toHaveCSS('stroke-width', '1.75px');
      }
      if (!touch) {
        await report.hover();
        await expect(report.locator('svg')).toHaveCSS('color', 'rgb(154, 91, 10)');
        await expect(report).toHaveCSS('background-color', 'rgb(255, 242, 215)');
      }
      await share.focus();
      await page.keyboard.press('Tab');
      await expect(report).toBeFocused();
      await expect(report.locator('svg')).toHaveCSS('color', 'rgb(154, 91, 10)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `C:/Users/seif/AppData/Local/Temp/opencode/resource-icons-${touch ? 'touch' : 'desktop'}.png`, fullPage: true });
    });
  });
}
