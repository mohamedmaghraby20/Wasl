import { expect, test, type Page } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const cities = [
  { id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' },
  { id: 'istanbul', nameEn: 'Istanbul', nameAr: 'إسطنبول', nameTr: 'İstanbul' },
];
const community = (id: string, count = 12) => ({
  id,
  slug: id,
  name: id,
  description: 'Meet neighbors and share interests.',
  ownerType: 'user',
  ownerId: 'host',
  hostName: 'Community host',
  admissionMode: 'open',
  cityId: 'ankara',
  cityName: 'Ankara',
  memberCount: count,
  categories: [{ id: 'culture', nameEn: 'Culture', nameAr: 'ثقافة', nameTr: 'Kültür' }],
});

async function mockDiscovery(
  page: Page,
  options: {
    emptyLocal?: boolean;
    errorLocal?: boolean;
    emptyNationwide?: boolean;
    errorNationwide?: boolean;
    slowLocal?: boolean;
    localSize?: number;
    localEvents?: boolean;
  } = {},
) {
  const requests: URL[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/reference/cities')) return route.fulfill({ json: cities });
    if (url.pathname.endsWith('/reference/categories')) return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/events') && options.localEvents)
      return route.fulfill({
        json: {
          items: [
            {
              id: 'local-event',
              slug: 'local-event',
              title: 'Local event',
              description: 'An upcoming gathering.',
              hostName: 'Host',
              hostType: 'user',
              hostId: 'host',
              online: false,
              locationName: 'Hall',
              startsAt: '2099-11-03T12:00:00Z',
              visibility: 'public',
              cancelled: false,
              admissionMode: 'instant',
              acceptedRegistrationCount: 0,
              capacity: null,
              cityId: 'ankara',
              cityName: 'Ankara',
              categories: [],
            },
          ],
          page: 1,
          total: 1,
          hasMore: false,
        },
      });
    if (url.pathname.endsWith('/communities')) {
      const city = url.searchParams.get('city');
      if ((city && options.errorLocal) || (!city && options.errorNationwide))
        return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
      if (city === 'ankara' && options.slowLocal)
        await new Promise((resolve) => setTimeout(resolve, 800));
      const items =
        (city && options.emptyLocal) || (!city && options.emptyNationwide)
          ? []
          : Array.from({ length: city ? (options.localSize ?? 1) : 4 }, (_, index) =>
              community(`${city ?? 'Nationwide'} community ${index + 1}`, 12 - index),
            );
      return route.fulfill({
        json: { items, page: 1, pageSize: 4, total: items.length, hasMore: false },
      });
    }
    return route.fulfill({ json: { items: [], page: 1, pageSize: 4, total: 0, hasMore: false } });
  });
  return requests;
}

test('nationwide communities show four counts and retain member ordering into discovery', async ({
  page,
}) => {
  const requests = await mockDiscovery(page);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Communities across Türkiye' });
  await expect(section.locator('article')).toHaveCount(4);
  await expect(section.getByText('12 members')).toBeVisible();
  expect(
    requests.some(
      (url) =>
        url.pathname.endsWith('/communities') &&
        url.searchParams.get('order') === 'member-count' &&
        url.searchParams.get('pageSize') === '4',
    ),
  ).toBe(true);
  await section.getByRole('link', { name: 'Explore all' }).click();
  await expect(page).toHaveURL(/\/communities\?order=member-count$/);
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.pathname.endsWith('/communities') &&
          url.searchParams.get('order') === 'member-count' &&
          url.searchParams.get('pageSize') === '12',
      ),
    )
    .toBe(true);
  await expect(page.getByText('12 members')).toBeVisible();
});

test('event fallback does not change local communities or top up a nonempty city', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const requests = await mockDiscovery(page);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Communities in Ankara' });
  await expect(section.locator('article')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Upcoming events across Türkiye' })).toBeVisible();
  await expect(section.getByRole('link', { name: 'Explore all' })).toHaveAttribute(
    'href',
    '/communities?order=member-count&city=ankara',
  );
  expect(
    requests.filter(
      (url) => url.pathname.endsWith('/communities') && !url.searchParams.has('city'),
    ),
  ).toHaveLength(0);
  await section.getByRole('link', { name: 'Explore all' }).click();
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.pathname.endsWith('/communities') &&
          url.searchParams.get('pageSize') === '12' &&
          url.searchParams.get('city') === 'ankara' &&
          url.searchParams.get('order') === 'member-count',
      ),
    )
    .toBe(true);
});

test('empty local communities use nationwide scope without changing the selected city', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const requests = await mockDiscovery(page, { emptyLocal: true, localEvents: true });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Communities across Türkiye' });
  await expect(section.locator('article')).toHaveCount(4);
  await expect(
    page
      .getByRole('region', { name: 'Upcoming events in Ankara' })
      .getByRole('link', { name: 'Local event', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(section.getByRole('link', { name: 'Explore all' })).toHaveAttribute(
    'href',
    '/communities?order=member-count',
  );
  await section.getByRole('link', { name: 'Explore all' }).click();
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.pathname.endsWith('/communities') &&
          url.searchParams.get('pageSize') === '12' &&
          !url.searchParams.has('city') &&
          url.searchParams.get('order') === 'member-count',
      ),
    )
    .toBe(true);
});

test('local errors never trigger nationwide communities and can be retried', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const options = { errorLocal: true };
  const requests = await mockDiscovery(page, options);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Communities in Ankara' });
  await expect(section.getByRole('button', { name: 'Retry' })).toBeVisible({ timeout: 15000 });
  expect(
    requests.filter(
      (url) => url.pathname.endsWith('/communities') && !url.searchParams.has('city'),
    ),
  ).toHaveLength(0);
  options.errorLocal = false;
  await section.getByRole('button', { name: 'Retry' }).click();
  await expect(section.getByText('12 members')).toBeVisible();
});

test('nationwide fallback failures stay retryable and do not become empty states', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const options = { emptyLocal: true, errorNationwide: true };
  await mockDiscovery(page, options);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Communities across Türkiye' });
  await expect(section.getByRole('button', { name: 'Retry' })).toBeVisible({ timeout: 15000 });
  await expect(section.getByText('Nothing here yet')).toHaveCount(0);
  options.errorNationwide = false;
  await section.getByRole('button', { name: 'Retry' }).click();
  await expect(section.locator('article')).toHaveCount(4);
});

test('city changes and clearing cannot show a delayed previous community collection', async ({
  page,
}) => {
  await mockDiscovery(page, { slowLocal: true });
  await page.goto('/');
  await page.locator('#home-city').click();
  await page.getByRole('option', { name: 'Ankara', exact: true }).click();
  await page.locator('#home-city').click();
  await page.getByRole('option', { name: 'Istanbul', exact: true }).click();
  const section = page.getByRole('region', { name: 'Communities in Istanbul' });
  await expect(
    section.getByRole('link', { name: 'istanbul community 1', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(section.getByText('ankara community 1', { exact: true })).toHaveCount(0);
  await page.locator('#home-city').click();
  await page.getByRole('option', { name: 'Across Türkiye', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Communities across Türkiye' }).locator('article'),
  ).toHaveCount(4);
});

for (const language of ['en', 'ar']) {
  for (const width of [375, 1440]) {
    test(`${language} community cards are readable and keyboard accessible at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((lang) => {
        localStorage.setItem('wasl-language', lang);
        localStorage.setItem('wasl-city', 'ankara');
      }, language);
      await mockDiscovery(page, { localSize: 4 });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const section = page.getByRole('region', {
        name: language === 'ar' ? 'مجتمعات في أنقرة' : 'Communities in Ankara',
      });
      await expect(section.locator('article')).toHaveCount(4);
      await expect(section.getByText(language === 'ar' ? '12 عضوًا' : '12 members')).toBeVisible();
      await expect(section.getByText(language === 'ar' ? 'ثقافة' : 'Culture')).toHaveCount(4);
      const link = section.getByRole('link', { name: 'ankara community 1', exact: true });
      await link.focus();
      await expect(link).toBeFocused();
      await expect(section.locator('article').first()).toHaveCSS('box-shadow', /rgb/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: test.info().outputPath(`homepage-${language}-${width}.png`),
        fullPage: true,
      });
      await section.screenshot({
        path: test.info().outputPath(`communities-${language}-${width}.png`),
      });
    });
  }
}
