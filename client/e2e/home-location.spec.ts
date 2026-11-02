import { expect, test, type Page } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const cities = [
  { id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' },
  { id: 'istanbul', nameEn: 'Istanbul', nameAr: 'إسطنبول', nameTr: 'İstanbul' },
];
const event = (id: string, cityId = 'ankara') => ({
  id,
  slug: id,
  title: id,
  description: 'Public event',
  hostName: 'Host',
  hostType: 'user',
  online: false,
  locationName: 'Hall',
  startsAt: '2099-11-03T12:00:00Z',
  endsAt: null,
  visibility: 'public',
  cancelled: false,
  admissionMode: 'instant',
  capacity: null,
  cityId,
  cityName: cityId,
  categories: [],
});

async function mockDiscovery(
  page: Page,
  options: { emptyLocal?: boolean; errorLocal?: boolean; slowAnkara?: boolean } = {},
) {
  const requests: URL[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/reference/cities')) return route.fulfill({ json: cities });
    if (url.pathname.endsWith('/reference/categories')) return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/discovery/categories')) return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/events')) {
      const city = url.searchParams.get('city');
      if (city && options.errorLocal)
        return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
      if (city === 'ankara' && options.slowAnkara)
        await new Promise((resolve) => setTimeout(resolve, 700));
      const items =
        city && options.emptyLocal
          ? []
          : [event(city ? `${city} gathering` : 'Nationwide gathering', city ?? 'istanbul')];
      return route.fulfill({
        json: { items, page: 1, pageSize: 4, total: items.length, hasMore: false },
      });
    }
    return route.fulfill({ json: { items: [], page: 1, total: 0, hasMore: false } });
  });
  return requests;
}

async function selectCity(page: Page, name: string) {
  await page.locator('#home-city').click();
  await page.getByRole('option', { name, exact: true }).click();
}

test('nationwide entry and manual city persist into search and subsequent visits', async ({
  page,
}) => {
  const requests = await mockDiscovery(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Upcoming events across Türkiye' })).toBeVisible();
  await selectCity(page, 'Ankara');
  await expect(page.getByRole('link', { name: 'ankara gathering', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('ankara');
  await page.reload();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await page.screenshot({
    path: test.info().outputPath('home-city-desktop-ltr.png'),
    fullPage: true,
  });
  await page.getByRole('searchbox', { name: 'Search communities and events' }).fill('music');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?/);
  const params = new URL(page.url()).searchParams;
  for (const [key, value] of Object.entries({
    q: 'music',
    city: 'ankara',
    cityScope: 'include-online',
    upcoming: 'true',
    nonCancelled: 'true',
  }))
    expect(params.get(key)).toBe(value);
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.pathname.endsWith('/events') &&
          url.searchParams.get('q') === 'music' &&
          url.searchParams.get('cityScope') === 'include-online',
      ),
    )
    .toBe(true);
});

test('clearing the city restores nationwide scope and removes only the remembered city', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('wasl-city', 'ankara');
    localStorage.setItem('other-preference', 'keep');
  });
  await mockDiscovery(page);
  await page.goto('/');
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await selectCity(page, 'Across Türkiye');
  await expect(page.getByRole('heading', { name: 'Upcoming events across Türkiye' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('other-preference'))).toBe('keep');
});

test('local empty results fall back honestly without changing selection or search scope', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const requests = await mockDiscovery(page, { emptyLocal: true });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Upcoming events across Türkiye' });
  await expect(
    section.getByRole('link', { name: 'Nationwide gathering', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  const destination = section.getByRole('link', { name: 'Explore all', exact: true });
  await expect(destination).toHaveAttribute(
    'href',
    '/events?modality=in-person&upcoming=true&nonCancelled=true',
  );
  await destination.click();
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.pathname.endsWith('/events') &&
          url.searchParams.get('modality') === 'in-person' &&
          url.searchParams.get('pageSize') !== '4' &&
          !url.searchParams.has('city') &&
          url.searchParams.get('upcoming') === 'true',
      ),
    )
    .toBe(true);
});

test('a failed local request is retryable and never triggers nationwide fallback', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const options = { errorLocal: true };
  const requests = await mockDiscovery(page, options);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Upcoming events in Ankara' });
  await expect(section.getByRole('button', { name: 'Retry' })).toBeVisible({ timeout: 15000 });
  expect(
    requests.filter((url) => url.pathname.endsWith('/events') && !url.searchParams.has('city')),
  ).toHaveLength(0);
  options.errorLocal = false;
  await section.getByRole('button', { name: 'Retry' }).click();
  await expect(section.getByRole('link', { name: 'ankara gathering', exact: true })).toBeVisible();
  await expect(section.getByRole('link', { name: 'Explore all', exact: true })).toHaveAttribute(
    'href',
    '/events?modality=in-person&upcoming=true&nonCancelled=true&city=ankara',
  );
});

test('rapid city changes cannot show delayed results under the newer city', async ({ page }) => {
  await mockDiscovery(page, { slowAnkara: true });
  await page.goto('/');
  await selectCity(page, 'Ankara');
  await selectCity(page, 'Istanbul');
  const section = page.getByRole('region', { name: 'Upcoming events in Istanbul' });
  await expect(
    section.getByRole('link', { name: 'istanbul gathering', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(900);
  await expect(section.getByRole('link', { name: 'ankara gathering', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');
});

test('invalid remembered city and unavailable storage leave discovery usable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'unsupported-city'));
  await mockDiscovery(page);
  await page.goto('/');
  await expect(page.locator('#home-city')).toContainText('Across Türkiye');
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable');
    };
    Storage.prototype.removeItem = () => {
      throw new Error('Storage unavailable');
    };
  });
  await selectCity(page, 'Ankara');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Ankara' })).toBeVisible();
});

test('mobile Arabic picker is keyboard accessible without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem('wasl-language', 'ar'));
  await mockDiscovery(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.locator('#home-city').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('combobox').fill('أنق');
  await page.keyboard.press('Enter');
  await expect(page.locator('#home-city')).toContainText('أنقرة');
  await expect(page.getByRole('heading', { name: 'فعاليات قادمة في أنقرة' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('home-city-mobile-rtl.png'),
    fullPage: true,
  });
});
