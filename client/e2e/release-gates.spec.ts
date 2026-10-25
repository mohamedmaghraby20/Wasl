import { expect, test } from '@playwright/test';

const event = {
  id: 'event-1',
  slug: 'event-1',
  title: 'Community gathering',
  description: 'Meet in Ankara.',
  visibility: 'public',
  hostType: 'user',
  hostId: 'host-1',
  hostName: 'Ali',
  organizationSlug: null,
  online: true,
  locationName: null,
  startsAt: '2099-11-22T12:00:00Z',
  endsAt: null,
  cancelled: false,
  capacity: null,
  admissionMode: 'instant',
  cityId: null,
  cityName: null,
  categories: [],
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/events/event-1/discussion?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0, hasMore: false }),
    }),
  );
});

test('guest can view an Event but must sign in to register and cannot open private screens', async ({
  page,
}) => {
  await page.route('**/api/v1/events/event-1?*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(event) }),
  );
  await page.goto('/events/event-1');
  await expect(page.getByRole('heading', { name: event.title })).toBeVisible();
  await page.getByRole('link', { name: 'Register for Event' }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fevents%2Fevent-1/);

  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fnotifications/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fadmin/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('an unlisted Event is viewable by direct link but marked noindex', async ({ page }) => {
  await page.route('**/api/v1/events/event-1?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...event, visibility: 'unlisted' }),
    }),
  );
  await page.goto('/events/event-1');
  await expect(page.getByRole('heading', { name: event.title })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('robots rules exclude known private routes without blocking public Events', async ({
  request,
}) => {
  const response = await request.get('/robots.txt');
  expect(response.ok()).toBe(true);
  const rules = await response.text();
  expect(rules).toContain('Disallow: /admin');
  expect(rules).toContain('Disallow: /notifications');
  expect(rules).toContain('Disallow: /messages');
  expect(rules).toContain('Disallow: /*/manage');
  expect(rules).not.toContain('Disallow: /events');
});

test('keyboard skip link reaches main content and Arabic changes document direction', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], page: 1, pageSize: 12, total: 0, hasMore: false }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find your people in Türkiye' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
