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
  acceptedRegistrationCount: 0,
  cityId,
  cityName: cityId,
  categories: [],
});

const stubBoundaries = {
  provinces: [
    {
      id: 'ankara',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [31, 38],
            [33, 38],
            [33, 40],
            [31, 40],
            [31, 38],
          ],
        ],
      },
    },
    {
      id: 'istanbul',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [27, 40],
            [29, 40],
            [29, 42],
            [27, 42],
            [27, 40],
          ],
        ],
      },
    },
  ],
};

type LocationMode =
  | { kind: 'success'; longitude: number; latitude: number; defer?: boolean; accuracy?: number }
  | { kind: 'denied' }
  | { kind: 'unavailable' }
  | { kind: 'timeout' }
  | { kind: 'unsupported' }
  | { kind: 'insecure' }
  | { kind: 'throws' }
  | { kind: 'sequence'; modes: Extract<LocationMode, { kind: 'success' }>[] };

async function mockDiscovery(page: Page, boundaries: 'stub' | 'real' | 'error' = 'stub') {
  const requests: URL[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/reference/cities')) return route.fulfill({ json: cities });
    if (url.pathname.endsWith('/categories')) return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/events')) {
      if (url.searchParams.get('modality') === 'online') {
        return route.fulfill({ json: { items: [], page: 1, pageSize: 4, total: 0, hasMore: false } });
      }
      const city = url.searchParams.get('city');
      const items = [event(city ? `${city} gathering` : 'Nationwide gathering', city ?? 'istanbul')];
      return route.fulfill({
        json: { items, page: 1, pageSize: 4, total: items.length, hasMore: false },
      });
    }
    return route.fulfill({ json: { items: [], page: 1, total: 0, hasMore: false } });
  });
  if (boundaries === 'stub')
    await page.route('**/geo/tr-provinces.json', (route) => route.fulfill({ json: stubBoundaries }));
  if (boundaries === 'error')
    await page.route('**/geo/tr-provinces.json', (route) =>
      route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
    );
  return requests;
}

async function mockLocation(page: Page, mode: LocationMode) {
  await page.addInitScript((configuration) => {
    const state = window as unknown as { locationCalls: number; releaseLocations: (() => void)[] };
    state.locationCalls = 0;
    state.releaseLocations = [];
    const failure = (code: number, message: string) => ({
      code,
      message,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
    const succeed = (
      success: PositionCallback,
      position: { longitude: number; latitude: number; defer?: boolean; accuracy?: number },
    ) => {
      const respond = () =>
          success({
            coords: {
              longitude: position.longitude,
              latitude: position.latitude,
              accuracy: position.accuracy ?? 20,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
           } as GeolocationPosition);
      if (position.defer) state.releaseLocations.push(respond);
      else respond();
    };
    if (configuration.kind === 'unsupported') {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
      return;
    }
    if (configuration.kind === 'insecure') {
      Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    }
    const geolocation = {
      getCurrentPosition: (
        success: PositionCallback,
        error?: PositionErrorCallback | null,
      ) => {
        state.locationCalls += 1;
        if (configuration.kind === 'throws') throw new Error('Position unavailable');
        if (configuration.kind === 'insecure') return;
        if (configuration.kind === 'denied') {
          error?.(failure(1, 'denied') as GeolocationPositionError);
          return;
        }
        if (configuration.kind === 'unavailable') {
          error?.(failure(2, 'unavailable') as GeolocationPositionError);
          return;
        }
        if (configuration.kind === 'timeout') {
          error?.(failure(3, 'timeout') as GeolocationPositionError);
          return;
        }
        if (configuration.kind === 'sequence') {
          const next =
            configuration.modes[Math.min(state.locationCalls - 1, configuration.modes.length - 1)];
          if (next) succeed(success, next);
          return;
        }
        succeed(success, configuration);
      },
      watchPosition: () => 0,
      clearWatch: () => {},
    };
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation });
  }, mode);
}

async function locationCalls(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { locationCalls: number }).locationCalls);
}

async function selectCity(page: Page, name: string) {
  await page.locator('#home-city').click();
  await page.getByRole('option', { name, exact: true }).click();
}

test('requests browser permission on arrival without a button and applies the mapped city', async ({
  page,
}) => {
  const requests = await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  await page.goto('/');

  expect(page.url()).not.toContain('?');
  await expect(page.getByRole('button', { name: 'Use my location' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Not now' })).toHaveCount(0);
  await expect(page.locator('form').getByText(/Coordinates are matched|Province boundaries/)).toHaveCount(0);

  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Ankara' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ankara gathering', exact: true })).toBeVisible();
  expect(await locationCalls(page)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('ankara');
  expect(new URL(page.url()).search).toBe('');
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key !== 'wasl-language').map((key) => localStorage.getItem(key))),
  ).toEqual(['ankara']);
  expect(
    requests.some(
      (url) => url.pathname.endsWith('/events') && url.searchParams.get('city') === 'ankara',
    ),
  ).toBe(true);
  expect(consoleMessages.join(' ')).not.toMatch(/\b(32|39)\.\d{3,}/);
  expect(consoleMessages.join(' ')).not.toMatch(/latitude|longitude|coords/i);
});

test('denying browser permission keeps manual city selection and search usable', async ({ page }) => {
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'denied' });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Location permission was not granted');
  expect(await locationCalls(page)).toBe(1);
  await expect(page.getByRole('button', { name: 'Use my location' })).toHaveCount(0);
  await selectCity(page, 'Istanbul');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/city=istanbul/);
});

test('a return visit automatically refreshes the remembered city', async ({
  page,
}) => {
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');
  await expect(page.locator('#home-city')).toContainText('Ankara');

  await page.reload();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Ankara' })).toBeVisible();
  await expect(page.getByText('City set to Ankara.')).toBeVisible();
  expect(await locationCalls(page)).toBe(1);
});

for (const [kind, copy] of [
  ['denied', 'Location permission was not granted'],
  ['unavailable', 'Your location could not be determined'],
  ['timeout', 'Finding your location took too long'],
  ['unsupported', 'Location is not available in this browser'],
  ['insecure', 'Location needs a secure connection'],
  ['throws', 'Your location could not be determined'],
] as const) {
  test(`${kind} preserves the current valid city and leaves manual selection usable`, async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('wasl-city', 'istanbul'));
    await mockDiscovery(page);
    await mockLocation(page, { kind });
    await page.goto('/');
    await expect(page.locator('#home-city')).toContainText('Istanbul');

    await expect(page.getByRole('alert')).toContainText(copy);
    await expect(page.locator('#home-city')).toContainText('Istanbul');
    await expect(page.getByRole('heading', { name: 'Upcoming events in Istanbul' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');

    await selectCity(page, 'Ankara');
    await expect(page.getByRole('heading', { name: 'Upcoming events in Ankara' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('ankara');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('coordinates outside the mapped provinces never become a guessed city', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'istanbul'));
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 23.7275, latitude: 37.9838 });
  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText(
    "We couldn't match your location to a supported city",
  );
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Istanbul' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');
});

test('a boundary data failure preserves the current state and retries on reload', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  await mockDiscovery(page, 'error');
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText('City boundaries could not load');
  await expect(page.locator('#home-city')).toContainText('Ankara');
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('ankara');

  await page.unroute('**/geo/tr-provinces.json');
  await page.route('**/geo/tr-provinces.json', (route) => route.fulfill({ json: stubBoundaries }));
  await page.reload();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(page.getByText('City set to Ankara.')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a delayed location response cannot overwrite a newer manual selection', async ({ page }) => {
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39, defer: true });
  await page.goto('/');

  await expect(page.getByText('Finding your city…')).toBeVisible();
  await selectCity(page, 'Istanbul');
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await expect(page.getByText('Finding your city…')).toHaveCount(0);

  await page.evaluate(() => (window as unknown as { releaseLocations: (() => void)[] }).releaseLocations.shift()?.());
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Istanbul' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');
});

test('a new home visit wins over a delayed earlier automatic response', async ({ page }) => {
  await mockDiscovery(page);
  await mockLocation(page, {
    kind: 'sequence',
    modes: [
      { kind: 'success', longitude: 32, latitude: 39, defer: true },
      { kind: 'success', longitude: 28, latitude: 41 },
    ],
  });
  await page.goto('/');

  await expect(page.getByText('Finding your city…')).toBeVisible();
  await page.getByRole('link', { name: 'Events', exact: true }).first().click();
  await expect(page).toHaveURL(/\/events/);
  await page.getByRole('link', { name: 'Home', exact: true }).click();

  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await page.evaluate(() => (window as unknown as { releaseLocations: (() => void)[] }).releaseLocations.shift()?.());
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Istanbul' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');
  expect(await locationCalls(page)).toBe(2);
});

test('manual correction persists city-only state and reload refreshes location', async ({ page }) => {
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');
  await expect(page.locator('#home-city')).toContainText('Ankara');

  await selectCity(page, 'Istanbul');
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');
  await page.reload();

  await expect(page.getByText('City set to Ankara.')).toBeVisible();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('ankara');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/latitude|longitude|coords|32\.8597|39\.9334/i);
});

test('Arabic RTL location feedback is keyboard accessible with usable copy', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem('wasl-language', 'ar'));
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'denied' });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'استخدم موقعي' })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('لم يتم منح إذن الموقع');
  await expect(page.locator('#home-city')).toContainText('في جميع أنحاء تركيا');
  await expect(page.getByRole('link', { name: /SimpleMaps/ })).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('home-geolocation-mobile-rtl.png'),
    fullPage: true,
  });
});

test('the bundled province boundaries resolve a real coordinate locally', async ({ page }) => {
  await mockDiscovery(page, 'real');
  await mockLocation(page, { kind: 'success', longitude: 32.8597, latitude: 39.9334 });
  await page.goto('/');

  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Ankara' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'SimpleMaps' })).toBeVisible();
});

test('the bundled province boundaries reject a real outside-country coordinate', async ({
  page,
}) => {
  await mockDiscovery(page, 'real');
  await mockLocation(page, { kind: 'success', longitude: 23.7275, latitude: 37.9838 });
  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText(
    "We couldn't match your location to a supported city",
  );
  await expect(page.locator('#home-city')).toContainText('Across Türkiye');
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
});

test('an inaccurate fix crossing a province edge leaves manual selection in control', async ({ page }) => {
  await mockDiscovery(page);
  await page.route('**/geo/tr-provinces.json', (route) => route.fulfill({ json: {
    provinces: [stubBoundaries.provinces[0], {
      id: 'istanbul', geometry: { type: 'Polygon', coordinates: [[[33, 38], [35, 38], [35, 40], [33, 40], [33, 38]]] },
    }],
  } }));
  await mockLocation(page, { kind: 'success', longitude: 32.9999, latitude: 39, accuracy: 100 });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText("We couldn't match your location");
  await expect(page.locator('#home-city')).toContainText('Across Türkiye');
  await selectCity(page, 'Istanbul');
  await expect(page.locator('#home-city')).toContainText('Istanbul');
});

for (const [name, longitude, latitude] of [
  ['an unmatched in-country point', 35, 39],
  ['a boundary hit', 33, 39],
  ['out-of-range coordinates', 190, 39],
] as const) {
  test(`${name} preserves nationwide discovery`, async ({ page }) => {
    await mockDiscovery(page);
    await mockLocation(page, { kind: 'success', longitude, latitude });
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText("We couldn't match your location");
    await expect(page.locator('#home-city')).toContainText('Across Türkiye');
    expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
    await selectCity(page, 'Ankara');
    await expect(page.locator('#home-city')).toContainText('Ankara');
  });
}

for (const failure of ['network', 'json', 'geometry', 'unsupported-city'] as const) {
  test(`mapping ${failure} leaves the current city and search usable`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wasl-city', 'istanbul'));
    await mockDiscovery(page, 'real');
    await page.route('**/geo/tr-provinces.json', (route) => {
      if (failure === 'network') return route.abort('failed');
      if (failure === 'json') return route.fulfill({ body: '{invalid', contentType: 'application/json' });
      if (failure === 'geometry') return route.fulfill({ json: { provinces: [{ id: 'ankara', geometry: { type: 'Polygon', coordinates: null } }] } });
      return route.fulfill({ json: { provinces: [{ ...stubBoundaries.provinces[0], id: 'unknown-city' }] } });
    });
    await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(failure === 'unsupported-city' ? "We couldn't match" : 'City boundaries could not load');
    await expect(page.locator('#home-city')).toContainText('Istanbul');
    await page.getByRole('searchbox').fill('music');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/city=istanbul/);
    await expect(page).toHaveURL(/q=music/);
  });
}

test('malformed geometry can be retried with a corrected asset on reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'istanbul'));
  await mockDiscovery(page, 'real');
  let downloads = 0;
  await page.route('**/geo/tr-provinces.json', (route) => {
    downloads += 1;
    return route.fulfill({ json: downloads === 1
      ? { provinces: [{ id: 'ankara', geometry: { type: 'Polygon', coordinates: null } }] }
      : stubBoundaries });
  });
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('City boundaries could not load');
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await page.reload();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Ankara' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(downloads).toBe(2);
  expect(await locationCalls(page)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('ankara');
});

test('a delayed polygon download cannot replace a manual city or block search', async ({ page }) => {
  await mockDiscovery(page, 'real');
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let started!: () => void;
  const download = new Promise<void>((resolve) => { started = resolve; });
  await page.route('**/geo/tr-provinces.json', async (route) => {
    started();
    await held;
    await route.fulfill({ json: stubBoundaries });
  });
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');
  await download;
  await expect(page.getByRole('status').filter({ hasText: 'Finding your city' })).toBeVisible();
  await selectCity(page, 'Istanbul');
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeEnabled();
  const response = page.waitForResponse('**/geo/tr-provinces.json');
  release();
  await response;
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  await expect(page.getByText('City set to Ankara.')).toHaveCount(0);
});

test('browser-granted coarse Istanbul coordinates resolve automatically with no external mapping calls', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ longitude: 28.9784, latitude: 41.0082, accuracy: 5_000 });
  await mockDiscovery(page, 'real');
  const boundaryRequests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/geo/')) boundaryRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Use my location' })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'City set to Istanbul.' })).toBeVisible();
  await expect(page.locator('#home-city')).toContainText('Istanbul');
  expect(boundaryRequests).toEqual([new URL('/geo/tr-provinces.json', page.url()).href]);
  await page.screenshot({ path: test.info().outputPath('home-geolocation-desktop-ltr.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('#home-city')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('home-geolocation-mobile-ltr.png'), fullPage: true });
});

test('storage failure does not block detected or manually corrected discovery', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    Storage.prototype.removeItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
  });
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await selectCity(page, 'Istanbul');
  await expect(page.getByRole('heading', { name: 'Upcoming events in Istanbul' })).toBeVisible();
});

test('clearing a detected city stays nationwide until the next page load', async ({ page }) => {
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await selectCity(page, 'Across Türkiye');
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
  expect(await locationCalls(page)).toBe(1);
  await page.reload();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  expect(await locationCalls(page)).toBe(1);
});

test('navigating away invalidates an outstanding location response', async ({ page }) => {
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39, defer: true });
  await page.goto('/');
  await expect(page.getByText('Finding your city…')).toBeVisible();
  await page.getByRole('link', { name: 'Events', exact: true }).first().click();
  await expect(page).toHaveURL(/\/events/);
  await page.evaluate(() => (window as unknown as { releaseLocations: (() => void)[] }).releaseLocations.shift()?.());
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBeNull();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('#home-city')).toContainText('Across Türkiye');
  await expect(page.getByText('Finding your city…')).toBeVisible();
  expect(await locationCalls(page)).toBe(2);
});

test('Arabic success and keyboard city correction stay synchronized in RTL', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasl-language', 'ar'));
  await mockDiscovery(page);
  await mockLocation(page, { kind: 'success', longitude: 32, latitude: 39 });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'تم اختيار أنقرة.' })).toBeVisible();
  await page.locator('#home-city').focus();
  await page.keyboard.press('Enter');
  const search = page.getByRole('combobox');
  await search.fill('إسطنبول');
  await search.press('Enter');
  await expect(page.locator('#home-city')).toContainText('إسطنبول');
  await expect(page.getByRole('heading', { name: 'فعاليات قادمة في إسطنبول' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wasl-city'))).toBe('istanbul');
  await page.screenshot({ path: test.info().outputPath('home-geolocation-desktop-rtl.png'), fullPage: true });
});
