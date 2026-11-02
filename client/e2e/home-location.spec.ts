import { expect, test, type Page } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const cities = [
  { id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' },
  { id: 'istanbul', nameEn: 'Istanbul', nameAr: 'إسطنبول', nameTr: 'İstanbul' },
];
const event = (id: string, cityId: string | null = 'ankara', online = false) => ({
  id,
  slug: id,
  title: id,
  description: 'Public event',
  hostName: 'Host',
  hostType: 'user',
  online,
  locationName: online ? null : 'Hall',
  startsAt: '2099-11-03T12:00:00Z',
  endsAt: null,
  visibility: 'public',
  cancelled: false,
  admissionMode: 'instant',
  capacity: null,
  acceptedRegistrationCount: 0,
  cityId,
  cityName: cityId,
  categories: [],
});

const onlineEvents = Array.from({ length: 13 }, (_, index) =>
  event(`online ${index + 1}`, index % 2 === 0 ? null : 'istanbul', true),
);

async function mockDiscovery(
  page: Page,
  options: {
    emptyLocal?: boolean;
    errorLocal?: boolean;
    slowAnkara?: boolean;
    emptyOnline?: boolean;
    errorOnline?: boolean;
    delayOnline?: boolean;
  } = {},
) {
  const requests: URL[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/reference/cities')) return route.fulfill({ json: cities });
    if (url.pathname.endsWith('/reference/categories')) return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/discovery/categories')) return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/events')) {
      if (url.searchParams.get('modality') === 'online') {
        if (options.errorOnline)
          return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
        if (options.delayOnline) await new Promise((resolve) => setTimeout(resolve, 1500));
        const page = Number(url.searchParams.get('page') ?? 1);
        const pageSize = Number(url.searchParams.get('pageSize') ?? 12);
        const all = options.emptyOnline ? [] : onlineEvents;
        return route.fulfill({
          json: {
            items: all.slice((page - 1) * pageSize, page * pageSize),
            page,
            pageSize,
            total: all.length,
            hasMore: page * pageSize < all.length,
          },
        });
      }
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

test('keeps online discovery nationwide, capped at four, with filters preserved through view all, pagination and history', async ({
  page,
}) => {
  const requests = await mockDiscovery(page);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Upcoming online events' });
  await expect(section.getByRole('link', { name: 'online 1', exact: true })).toBeVisible();
  await expect(section.locator('article')).toHaveCount(4);
  await selectCity(page, 'Ankara');
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(section.getByRole('link', { name: 'online 1', exact: true })).toBeVisible();
  await expect(section.getByRole('link', { name: 'online 2', exact: true })).toBeVisible();
  const collectionRequest = requests
    .filter(
      (url) => url.pathname.endsWith('/events') && url.searchParams.get('modality') === 'online',
    )
    .at(-1);
  if (!collectionRequest) throw new Error('The homepage must request online events.');
  expect(collectionRequest.searchParams.get('pageSize')).toBe('4');
  expect(collectionRequest.searchParams.get('upcoming')).toBe('true');
  expect(collectionRequest.searchParams.get('nonCancelled')).toBe('true');
  expect(collectionRequest.searchParams.has('city')).toBe(false);

  const destination = section.getByRole('link', { name: 'Explore all', exact: true });
  await expect(destination).toHaveAttribute(
    'href',
    '/events?modality=online&upcoming=true&nonCancelled=true',
  );
  await destination.click();
  await expect(page).toHaveURL(/\/events\?modality=online&upcoming=true&nonCancelled=true$/);
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.pathname.endsWith('/events') &&
          url.searchParams.get('modality') === 'online' &&
          url.searchParams.get('pageSize') === '12' &&
          url.searchParams.get('upcoming') === 'true' &&
          url.searchParams.get('nonCancelled') === 'true',
      ),
    )
    .toBe(true);

  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.searchParams.get('page') === '2' &&
          url.searchParams.get('modality') === 'online' &&
          url.searchParams.get('nonCancelled') === 'true',
      ),
    )
    .toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(/\/events\?modality=online&upcoming=true&nonCancelled=true$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/events\?modality=online&upcoming=true&nonCancelled=true$/);
  await page.goForward();
  await expect(page).toHaveURL(/page=2/);
});

test('hides only a successfully empty online collection', async ({ page }) => {
  const requests = await mockDiscovery(page, { emptyOnline: true });
  await page.goto('/');
  await expect
    .poll(() =>
      requests.some(
        (url) => url.pathname.endsWith('/events') && url.searchParams.get('modality') === 'online',
      ),
    )
    .toBe(true);
  await expect(page.getByRole('region', { name: 'Upcoming online events' })).toHaveCount(0);
  await expect(
    page
      .getByRole('region', { name: 'Upcoming events across Türkiye' })
      .getByRole('link', { name: 'Nationwide gathering', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const language of ['en', 'ar']) {
  for (const width of [375, 1440]) {
    test(`online collection remains readable and keyboard navigable: ${language} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript((lang) => localStorage.setItem('wasl-language', lang), language);
      await mockDiscovery(page);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const section = page.getByRole('region', {
        name: language === 'ar' ? 'فعاليات قادمة عبر الإنترنت' : 'Upcoming online events',
      });
      await expect(section.locator('article')).toHaveCount(4);
      const destination = section.getByRole('link', {
        name: language === 'ar' ? 'استكشف الكل' : 'Explore all',
        exact: true,
      });
      await destination.focus();
      await expect(destination).toBeFocused();
      await section.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: test.info().outputPath(`online-${language}-${width}.png`),
        fullPage: true,
      });
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/events\?modality=online&upcoming=true&nonCancelled=true$/);
    });
  }
}

test('shows an independent online loading state', async ({ page }) => {
  await mockDiscovery(page, { delayOnline: true });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Upcoming online events' });
  await expect(section.getByRole('status')).toContainText('Loading upcoming online events');
  await expect(
    page
      .getByRole('region', { name: 'Upcoming events across Türkiye' })
      .getByRole('link', { name: 'Nationwide gathering', exact: true }),
  ).toBeVisible();
});

test('keeps a failed online collection retryable without hiding other results', async ({
  page,
}) => {
  const options = { errorOnline: true };
  await mockDiscovery(page, options);
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Upcoming online events' });
  await expect(section.getByRole('alert')).toContainText('Could not load upcoming online events');
  await expect(
    page
      .getByRole('region', { name: 'Upcoming events across Türkiye' })
      .getByRole('link', { name: 'Nationwide gathering', exact: true }),
  ).toBeVisible();

  options.errorOnline = false;
  await section.getByRole('button', { name: 'Retry' }).click();
  await expect(section.getByRole('link', { name: 'online 1', exact: true })).toBeVisible();
});

test('a failed local request is retryable and never triggers nationwide fallback', async ({
  page,
}) => {
  const options = { errorLocal: true };
  const requests = await mockDiscovery(page, options);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Nationwide gathering', exact: true })).toBeVisible();
  requests.length = 0;
  await selectCity(page, 'Ankara');
  const section = page.getByRole('region', { name: 'Upcoming events in Ankara' });
  await expect(section.getByRole('button', { name: 'Retry' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Upcoming events across Türkiye' })).toHaveCount(0);
  await expect(section.getByRole('link', { name: 'Nationwide gathering', exact: true })).toHaveCount(0);
  expect(
    requests.filter(
      (url) =>
        url.pathname.endsWith('/events') &&
        url.searchParams.get('modality') === 'in-person' &&
        !url.searchParams.has('city'),
    ),
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

test('an invalid remembered city with failed references keeps nationwide search and reset usable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'removed-city'));
  const requests = await mockDiscovery(page);
  await page.route('**/reference/cities', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Cities could not load');
  await expect(page.getByRole('heading', { name: 'Upcoming events across Türkiye' })).toBeVisible();
  await expect(page.locator('#home-city')).toContainText('Across Türkiye');
  expect(requests.filter((url) => url.searchParams.has('city'))).toEqual([]);
  await page.getByRole('searchbox', { name: 'Search communities and events' }).fill('music');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?/);
  expect(new URL(page.url()).searchParams.get('city')).toBeNull();
  expect(new URL(page.url()).searchParams.get('q')).toBe('music');
  await page.goBack();
  await expect(page.getByRole('alert')).toContainText('Cities could not load');
  await page.locator('#home-city').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('option', { name: 'Across Türkiye', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('reference-error-nationwide-reset.png') });
  await page.getByRole('option', { name: 'Across Türkiye', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
  await expect(page.locator('#home-city')).toContainText('Across Türkiye');
});

test('a valid remembered city waits for references before becoming active', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const requests = await mockDiscovery(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/reference/cities', async (route) => {
    await held;
    await route.fulfill({ json: cities });
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Nationwide gathering', exact: true })).toBeVisible();
  expect(requests.filter((url) => url.searchParams.has('city'))).toEqual([]);
  release();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Ankara' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('ankara');
});

test('clearing while references load prevents a remembered city restoring later', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  await mockDiscovery(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/reference/cities', async (route) => {
    await held;
    await route.fulfill({ json: cities });
  });
  await page.goto('/');
  await selectCity(page, 'Across Türkiye');
  const response = page.waitForResponse('**/reference/cities');
  release();
  await response;
  await expect(page.locator('#home-city')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#home-city')).toContainText('Across Türkiye');
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
});

test('a validated city survives a later reference failure and can still be cleared', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T12:00:00Z') });
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  await mockDiscovery(page);
  await page.goto('/');
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await selectCity(page, 'Istanbul');
  await page.route('**/reference/cities', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.clock.fastForward(60_000);
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('alert')).toContainText('Cities could not load');
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Istanbul' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');
  await page.getByRole('searchbox', { name: 'Search communities and events' }).fill('music');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/city=istanbul/);
  await page.goBack();
  await expect(page.getByRole('alert')).toContainText('Cities could not load');
  await selectCity(page, 'Across Türkiye');
  await expect(page.getByRole('heading', { name: 'Upcoming events across Türkiye' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
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
  await expect(page.getByRole('heading', { name: 'فعاليات قادمة عبر الإنترنت' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('home-city-mobile-rtl.png'),
    fullPage: true,
  });
});
