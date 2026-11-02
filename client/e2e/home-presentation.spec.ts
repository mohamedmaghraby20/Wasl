import { expect, test, type Page } from '@playwright/test';

// Auth journeys need a configured client build. Local verification uses
// VITE_SUPABASE_URL=http://127.0.0.1:54329 and VITE_SUPABASE_PUBLISHABLE_KEY=local-browser-fixture.
// All auth HTTP requests are intercepted below; no provider credentials or live service is used.

const music = { id: 'music', nameEn: 'Music', nameAr: 'الموسيقى', nameTr: 'Müzik' };
const cities = [{ id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' }];

async function mockHome(page: Page, count = 4) {
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/reference/cities')) return route.fulfill({ json: cities });
    if (url.pathname.endsWith('/privacy/status'))
      return route.fulfill({ json: { requiresOnboarding: false } });
    if (url.pathname.endsWith('/mine')) return route.fulfill({ json: [] });
    if (
      url.pathname.endsWith('/reference/categories') ||
      url.pathname.endsWith('/discovery/categories')
    )
      return route.fulfill({ json: [music] });
    const community = url.pathname.endsWith('/communities');
    const online = url.searchParams.get('modality') === 'online';
    const items = Array.from({ length: count }, (_, index) => ({
      id: `${community ? 'community' : online ? 'online' : 'event'}-${index}`,
      slug: `${community ? 'community' : online ? 'online' : 'event'}-${index}`,
      ...(community
        ? { name: `Community ${index + 1}` }
        : { title: `${online ? 'Online' : 'Ankara'} gathering ${index + 1}` }),
      description: 'Meet people who share your interests and enjoy activities together.',
      hostName: 'Wasl friends',
      hostType: 'user',
      online,
      cityId: 'ankara',
      cityName: 'Ankara',
      categories: [music],
      startsAt: '2099-11-03T12:00:00Z',
      cancelled: false,
      visibility: 'public',
      admissionMode: index === 1 ? 'approval' : 'instant',
      capacity: 10,
      acceptedRegistrationCount: index === 0 ? 10 : 3,
      memberCount: 12,
    }));
    return route.fulfill({ json: { items, page: 1, pageSize: 4, total: count, hasMore: false } });
  });
}

test('mobile visitors browse a capped horizontal event row with named keyboard controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockHome(page);
  await page.goto('/');
  const events = page.getByRole('region', { name: 'Upcoming events across Türkiye', exact: true });
  await expect(events.getByRole('article')).toHaveCount(4);
  const next = events.getByRole('button', { name: 'Next cards' });
  const previous = events.getByRole('button', { name: 'Previous cards' });
  await expect(next).toBeVisible();
  await expect(previous).toBeDisabled();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(previous).toBeEnabled();
  await events.getByRole('link', { name: 'Ankara gathering 4', exact: true }).focus();
  await expect(
    events.getByRole('link', { name: 'Ankara gathering 4', exact: true }),
  ).toBeInViewport();
  await events.getByRole('group').focus();
  await page.keyboard.press('End');
  await expect(next).toBeDisabled();
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
});

for (const language of ['en', 'ar']) {
  for (const width of [375, 1440]) {
    test(`presentation ${language} at ${width}px has natural row navigation and visible focus`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript((lang) => localStorage.setItem('wasl-language', lang), language);
      await mockHome(page);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const events = page.locator('section').filter({ has: page.locator('#events-heading') });
      await expect(events.getByRole('article')).toHaveCount(4);
      if (width === 375) {
        const next = events.getByRole('button', {
          name: language === 'ar' ? 'البطاقات التالية' : 'Next cards',
        });
        await next.focus();
        expect(await next.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
        await page.keyboard.press('Enter');
        const row = events.getByRole('group');
        await row.focus();
        await page.keyboard.press('End');
        await expect(next).toBeDisabled();
        await page.keyboard.press('Home');
        await expect(next).toBeEnabled();
        await page.keyboard.press(language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
        await expect(
          events.getByRole('button', {
            name: language === 'ar' ? 'البطاقات السابقة' : 'Previous cards',
          }),
        ).toBeEnabled();
        await page.keyboard.press('Home');
      } else {
        await expect(events.getByRole('button')).toHaveCount(0);
      }
      const first = events.getByRole('article').first().getByRole('link');
      await first.focus();
      expect(
        await first.evaluate((el) => getComputedStyle(el.closest('article')!).boxShadow),
      ).not.toBe('none');
      await page.evaluate(() => scrollTo(0, 0));
      expect(await page.locator('html').evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
      const eventsY = (await events.boundingBox())!.y;
      expect(eventsY).toBeLessThan(width === 375 ? 680 : 540);
      await page.screenshot({
        path: testInfo.outputPath(`homepage-${language}-${width}.png`),
        fullPage: true,
      });
      if (width === 375) {
        await events.scrollIntoViewIfNeeded();
        await page.evaluate(() => scrollBy(0, -80));
        await page.screenshot({ path: testInfo.outputPath(`row-${language}-${width}.png`) });
      }
    });
  }
}

test('one-item rows omit controls and narrow reflow keeps all cards reachable', async ({
  page,
}) => {
  await mockHome(page, 1);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const events = page.getByRole('region', { name: 'Upcoming events across Türkiye', exact: true });
  await expect(events.getByRole('article')).toHaveCount(1);
  await expect(events.getByRole('button')).toHaveCount(0);
  await events.getByRole('link', { name: 'Ankara gathering 1', exact: true }).focus();
  await expect(
    events.getByRole('link', { name: 'Ankara gathering 1', exact: true }),
  ).toBeInViewport();
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 640, height: 900 });
  await expect(events.getByRole('button')).toHaveCount(0);
});

test('the homepage cap is four even if a collection returns more', async ({ page }) => {
  await mockHome(page, 6);
  await page.goto('/');
  for (const id of ['events', 'communities', 'online-events']) {
    await expect(
      page
        .locator('section')
        .filter({ has: page.locator(`#${id}-heading`) })
        .getByRole('article'),
    ).toHaveCount(4);
  }
});

test('200-percent-equivalent desktop reflow keeps rows and destinations usable', async ({
  page,
}, testInfo) => {
  // A 1280px desktop viewport at 200% browser zoom has a 640 CSS-pixel layout viewport.
  await page.setViewportSize({ width: 640, height: 900 });
  await mockHome(page);
  await page.goto('/');
  const events = page.getByRole('region', { name: 'Upcoming events across Türkiye', exact: true });
  await expect(events.getByRole('article')).toHaveCount(4);
  const row = events.getByRole('group');
  await row.focus();
  await page.keyboard.press('End');
  await expect(events.getByRole('button', { name: 'Next cards' })).toBeDisabled();
  const last = events.getByRole('article').last();
  expect((await last.boundingBox())!.width).toBeGreaterThan(250);
  await last.getByRole('link').focus();
  await expect(last.getByRole('link')).toBeInViewport();
  expect(await page.locator('html').evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('zoom-reflow.png'), fullPage: true });
  await events.getByRole('link', { name: 'Explore all', exact: true }).click();
  await expect(page).toHaveURL(/\/events\?modality=in-person&upcoming=true&nonCancelled=true/);
});

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

async function mockAuth(page: Page) {
  const confirmationDestinations: string[] = [];
  await page.route('**/auth/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/signup')) {
      confirmationDestinations.push(url.searchParams.get('redirect_to') ?? '');
      return route.fulfill({ json: { user, session: null } });
    }
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user });
    return route.fulfill({
      json: {
        access_token: token,
        refresh_token: 'fixture-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user,
      },
    });
  });
  return confirmationDestinations;
}

for (const kind of ['event', 'community']) {
  test(`guest sign-in resumes ${kind} creation and authenticated discovery omits signup`, async ({
    page,
  }) => {
    await mockHome(page);
    await mockAuth(page);
    await page.goto('/');
    await page
      .getByRole('region', { name: 'Bring people together' })
      .getByRole('link', { name: `Create ${kind === 'event' ? 'an event' : 'a community'}` })
      .click();
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?returnTo=%2Fcreate%2F${kind}`));
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('browser-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(`/create/${kind}`);
    await expect(
      page.getByRole('heading', {
        name: `Create ${kind === 'event' ? 'an event' : 'a community'}`,
        exact: true,
      }),
    ).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Find your next gathering' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Bring people together' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(12);
    await expect(page.locator('#home-city')).toBeEnabled();
  });
}

test('signup confirmation email retains the creation intent and the callback resumes it', async ({
  page,
}) => {
  await mockHome(page);
  const redirects = await mockAuth(page);
  await page.goto('/');
  await page
    .getByRole('region', { name: 'Bring people together' })
    .getByRole('link', { name: 'Create a community' })
    .click();
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Name shown on your profile').fill('Browser visitor');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('browser-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Check browser@example.test');
  expect(new URL(redirects[0]!).searchParams.get('returnTo')).toBe('/create/community');
  await page.goto(
    `${redirects[0]}#access_token=${token}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=signup`,
  );
  await expect(page).toHaveURL('/create/community');
  await expect(
    page.getByRole('heading', { name: 'Create a community', exact: true }),
  ).toBeVisible();
});

test('image-card loading reserves row dimensions and failed covers retain navigation', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await mockHome(page);
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/events?*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('modality') !== 'online') await ready;
    await route.fallback();
  });
  await page.route('**/images/community-covers/*', (route) => route.abort());
  await page.goto('/');
  const events = page.getByRole('region', { name: 'Upcoming events across Türkiye', exact: true });
  await expect(events.getByRole('status')).toContainText('Loading');
  const loadingHeight = (await events.boundingBox())!.height;
  await page.screenshot({ path: testInfo.outputPath('loading-mobile.png'), fullPage: true });
  await expect(page.getByRole('link', { name: 'Community 1', exact: true })).toBeVisible();
  release();
  await expect(events.getByRole('article')).toHaveCount(4);
  expect(Math.abs((await events.boundingBox())!.height - loadingHeight)).toBeLessThanOrEqual(4);
  await expect(events.getByRole('article').first().locator('img')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('failed-covers-mobile.png'), fullPage: true });
  await events.getByRole('link', { name: 'Ankara gathering 1', exact: true }).click();
  await expect(page).toHaveURL('/events/event-0');
});

test('community and category errors remain independent while empty online is hidden and retry recovers', async ({
  page,
}, testInfo) => {
  await mockHome(page);
  let failed = true;
  await page.route('**/api/v1/communities?*', (route) =>
    failed ? route.fulfill({ status: 503, json: { message: 'Unavailable' } }) : route.fallback(),
  );
  await page.route('**/api/v1/discovery/categories*', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.route('**/api/v1/events?*', (route) =>
    new URL(route.request().url()).searchParams.get('modality') === 'online'
      ? route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 4, hasMore: false } })
      : route.fallback(),
  );
  await page.goto('/');
  const communities = page.getByRole('region', { name: 'Communities across Türkiye', exact: true });
  await expect(communities.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Browse by interest' })
      .getByRole('button', { name: 'Retry', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#online-events-heading')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ankara gathering 1', exact: true })).toBeVisible();
  await expect(
    page.getByRole('searchbox', { name: 'Search communities and events' }),
  ).toBeEnabled();
  await expect(page.locator('#home-city')).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath('independent-errors-desktop.png'),
    fullPage: true,
  });
  failed = false;
  await communities.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(communities.getByRole('article')).toHaveCount(4);
});

for (const language of ['en', 'ar']) {
  test(`native touch scrolling works in ${language} without relying on swipe-only controls`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 900 },
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.addInitScript((lang) => localStorage.setItem('wasl-language', lang), language);
    await mockHome(page);
    await page.goto('/');
    const events = page.locator('section').filter({ has: page.locator('#events-heading') });
    const next = events.getByRole('button', {
      name: language === 'ar' ? 'البطاقات التالية' : 'Next cards',
    });
    await next.scrollIntoViewIfNeeded();
    const box = (await next.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await next.tap();
    const row = events.getByRole('group');
    await row.focus();
    await page.keyboard.press('Home');
    await row.scrollIntoViewIfNeeded();
    const bounds = (await row.boundingBox())!;
    const first = events.getByRole('article').first();
    const before = (await first.boundingBox())!.x;
    const cdp = await context.newCDPSession(page);
    const start = language === 'ar' ? bounds.x + 50 : bounds.x + bounds.width - 50;
    const direction = language === 'ar' ? 1 : -1;
    const y = Math.max(100, bounds.y + 90);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start, y }],
    });
    for (let step = 1; step <= 6; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start + direction * step * 28, y }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect
      .poll(async () => Math.abs((await first.boundingBox())!.x - before))
      .toBeGreaterThan(40);
    await page.screenshot({ path: testInfo.outputPath(`touch-${language}.png`) });
    await context.close();
  });
}

test('discovery precedes one guest signup invitation and creation preserves the chosen destination', async ({
  page,
}) => {
  await mockHome(page);
  await page.goto('/');
  const signup = page.getByRole('region', { name: 'Find your next gathering' });
  await expect(signup.getByRole('link', { name: 'Create account' })).toHaveAttribute(
    'href',
    '/sign-up?returnTo=%2F',
  );
  const creation = page.getByRole('region', { name: 'Bring people together' });
  await expect(page.locator('main').getByRole('heading', { level: 2 })).toHaveText([
    'Upcoming events across Türkiye',
    'Communities across Türkiye',
    'Upcoming online events',
    'Browse by interest',
    'Find your next gathering',
    'Bring people together',
  ]);
  await creation.getByRole('link', { name: 'Create an event' }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate%2Fevent/);
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-up\?returnTo=%2Fcreate%2Fevent/);
});
