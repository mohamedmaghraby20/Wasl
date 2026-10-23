import { expect, test } from '@playwright/test';

test('shows public Event discussion in a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const response = path.endsWith('/discussion')
      ? {
          items: [
            {
              id: 'post-1',
              parentId: null,
              authorId: 'author-1',
              authorName: 'Mariam',
              body: 'See you there!',
              createdAt: '2026-10-22T11:00:00Z',
              updatedAt: '2026-10-22T11:00:00Z',
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          hasMore: false,
        }
      : path.endsWith('/events/event-1')
        ? {
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
            startsAt: '2026-11-22T12:00:00Z',
            endsAt: null,
            cancelled: false,
            capacity: null,
            admissionMode: 'instant',
            cityId: null,
            cityName: null,
            categories: [],
          }
        : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
  await page.goto('/events/event-1');
  await expect(page.getByRole('heading', { name: 'Event discussion' })).toBeVisible();
  await expect(page.getByText('See you there!')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mariam' })).toBeVisible();
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/discussion-mobile.png',
    fullPage: true,
  });
});
