import { expect, test } from '@playwright/test';

for (const language of ['en', 'ar']) {
  for (const width of [390, 1440]) {
    test(`personal sidebar ${language} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((lang) => localStorage.setItem('wasl-language', lang), language);
      const user = {
        id: '00000000-0000-4000-8000-000000000007',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'browser@example.test',
        app_metadata: { provider: 'email' },
        user_metadata: { display_name: 'Browser visitor' },
        created_at: '2026-01-01T00:00:00Z',
      };
      const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', exp: 4102444800 })).toString('base64url')}.fixture`;
      await page.route('**/auth/v1/**', (route) =>
        route.fulfill({
          json: route.request().url().includes('/user')
            ? user
            : {
                access_token: token,
                refresh_token: 'fixture-refresh',
                expires_in: 3600,
                token_type: 'bearer',
                user,
              },
        }),
      );
      let empty = false;
      let fail = false;
      const communities = Array.from({ length: 6 }, (_, index) => ({
        id: `community-${index}`,
        slug: `community-${index}`,
        name:
          language === 'en'
            ? `Community ${index + 1} for language and culture`
            : `مجتمع اللغة والثقافة ${index + 1}`,
        status: 'ACTIVE',
        requestedAt: `2026-01-0${index + 1}T12:00:00Z`,
      }));
      const events = [
        {
          id: 'event-1',
          slug: 'event-1',
          title: language === 'en' ? 'Coffee and conversation in Ankara' : 'قهوة وحوار في أنقرة',
          startsAt: '2099-01-01T12:00:00Z',
          status: 'ACCEPTED',
          cancelled: false,
        },
      ];
      await page.route('**/api/v1/**', (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/participation/me'))
          return route.fulfill({
            status: fail ? 503 : 200,
            json: { communities: empty ? [] : communities, events: empty ? [] : events },
          });
        if (path.endsWith('/privacy/status'))
          return route.fulfill({ json: { requiresOnboarding: false } });
        if (
          path.endsWith('/mine') ||
          path.includes('/reference/') ||
          path.endsWith('/discovery/categories')
        )
          return route.fulfill({ json: [] });
        return route.fulfill({
          json: { items: [], page: 1, pageSize: 4, total: 0, hasMore: false },
        });
      });
      await page.goto('/');
      await expect(page.locator('aside')).toHaveCount(0);
      await page.goto(
        `/sign-in?returnTo=%2F#access_token=${token}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=signup`,
      );
      await expect(page.locator('#home-going-heading')).toBeVisible();
      const sidebar = page.getByRole('complementary', {
        name: language === 'en' ? 'Your activity' : 'نشاطك',
      });
      await expect(sidebar.getByRole('listitem')).toHaveCount(6);
      await expect(sidebar.getByRole('link', { name: events[0]!.title })).toHaveAttribute(
        'href',
        '/events/event-1',
      );
      expect(await page.locator('html').evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
      const box = (await sidebar.boundingBox())!;
      const discovery = (await page.locator('#events-heading').boundingBox())!;
      if (width === 1440)
        expect(language === 'en' ? box.x > discovery.x : box.x < discovery.x).toBe(true);
      else expect(box.y + box.height <= discovery.y).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('sidebar.png'), fullPage: true });
      await sidebar
        .getByRole('link', { name: language === 'en' ? 'See all your events' : 'عرض كل فعالياتك' })
        .click();
      await expect(page).toHaveURL(/\/activity\?view=events/);
      await expect(page.locator('#activity-events-heading')).toBeVisible();
      await expect(page.locator('#activity-communities-heading')).toHaveCount(0);
      empty = true;
      await page.goto('/');
      await expect(sidebar.getByRole('listitem')).toHaveCount(0);
      await expect(
        sidebar.getByRole('link', { name: language === 'en' ? 'Find events' : 'ابحث عن فعاليات' }),
      ).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('empty.png'), fullPage: true });
      fail = true;
      await page.reload();
      await expect(sidebar.getByRole('alert')).toBeVisible({ timeout: 15000 });
      await expect(sidebar.getByRole('link')).toHaveCount(0);
      fail = false;
      await sidebar.getByRole('button').click();
      await expect(
        sidebar.getByRole('link', { name: language === 'en' ? 'Find events' : 'ابحث عن فعاليات' }),
      ).toBeVisible();
    });
  }
}
