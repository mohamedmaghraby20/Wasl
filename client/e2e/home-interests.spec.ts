import { expect, test, type Page } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const cities = [
  { id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' },
  { id: 'istanbul', nameEn: 'Istanbul', nameAr: 'إسطنبول', nameTr: 'İstanbul' },
];
const music = { id: 'music', nameEn: 'Music', nameAr: 'الموسيقى', nameTr: 'Müzik' };
const art = { id: 'art', nameEn: 'Art', nameAr: 'الفنون', nameTr: 'Sanat' };

async function mockInterests(
  page: Page,
  options: {
    error?: boolean;
    empty?: boolean;
    delayed?: boolean;
    categories?: (typeof music)[];
  } = {},
) {
  const requests: URL[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/reference/cities')) return route.fulfill({ json: cities });
    if (url.pathname.endsWith('/reference/categories'))
      return route.fulfill({ json: [music, art] });
    if (url.pathname.endsWith('/discovery/categories')) {
      if (options.delayed) await new Promise((resolve) => setTimeout(resolve, 900));
      if (options.error) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
      return route.fulfill({
        json: options.empty
          ? []
          : url.searchParams.get('city') === 'istanbul'
            ? [art]
            : (options.categories ?? [music]),
      });
    }
    const matching = url.searchParams.get('category') === 'music';
    const items =
      matching && url.pathname.endsWith('/events')
        ? [
            {
              id: 'online-music',
              slug: 'online-music',
              title: 'Online music gathering',
              description: 'Public online event',
              hostName: 'Host',
              hostType: 'user',
              online: true,
              startsAt: '2099-11-03T12:00:00Z',
              visibility: 'public',
              cancelled: false,
              admissionMode: 'instant',
              capacity: null,
              categories: [music],
            },
          ]
        : [];
    return route.fulfill({
      json: { items, page: 1, pageSize: 4, total: items.length, hasMore: false },
    });
  });
  return requests;
}

test('interest destination retains selected city during nationwide fallback and shows matching online content', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const requests = await mockInterests(page);
  await page.goto('/');
  const interests = page.getByRole('region', { name: 'Browse by interest' });
  const link = interests.getByRole('link', { name: 'Music', exact: true });
  await expect(link).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upcoming events across Türkiye' })).toBeVisible();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  const href = await link.getAttribute('href');
  const params = new URL(href!, 'http://localhost').searchParams;
  expect(Object.fromEntries(params)).toEqual({
    category: 'music',
    city: 'ankara',
    upcoming: 'true',
    nonCancelled: 'true',
    cityScope: 'include-online',
  });
  await link.click();
  await expect(page).toHaveURL(/\/discover\?/);
  await expect(
    page.getByRole('link', { name: 'Online music gathering', exact: true }),
  ).toBeVisible();
  expect(
    requests.some(
      (url) =>
        url.pathname.endsWith('/events') &&
        url.searchParams.get('category') === 'music' &&
        url.searchParams.get('city') === 'ankara' &&
        url.searchParams.get('cityScope') === 'include-online' &&
        url.searchParams.get('upcoming') === 'true' &&
        url.searchParams.get('nonCancelled') === 'true',
    ),
  ).toBe(true);
});

test('city changes and clearing update interests without inheriting the event fallback scope', async ({
  page,
}) => {
  const requests = await mockInterests(page, { delayed: true });
  await page.goto('/');
  const interests = page.getByRole('region', { name: 'Browse by interest' });
  await expect(interests.getByRole('status')).toContainText('Loading categories');
  await expect(
    page.getByRole('searchbox', { name: 'Search communities and events' }),
  ).toBeEnabled();
  await page.locator('#home-city').click();
  await page.getByRole('option', { name: 'Ankara', exact: true }).click();
  await page.locator('#home-city').click();
  await page.getByRole('option', { name: 'Istanbul', exact: true }).click();
  const artLink = interests.getByRole('link', { name: 'Art', exact: true });
  await expect(artLink).toHaveAttribute('href', /city=istanbul/);
  await expect(interests.getByRole('link', { name: 'Music', exact: true })).toHaveCount(0);
  await page.locator('#home-city').click();
  await page.getByRole('option', { name: 'Across Türkiye', exact: true }).click();
  const musicLink = interests.getByRole('link', { name: 'Music', exact: true });
  await expect(musicLink).toHaveAttribute(
    'href',
    '/discover?category=music&upcoming=true&nonCancelled=true&cityScope=include-online',
  );
  expect(
    requests
      .filter((url) => url.pathname.endsWith('/discovery/categories'))
      .map((url) => url.searchParams.get('city')),
  ).toEqual(expect.arrayContaining([null, 'ankara', 'istanbul']));
});

test('interest errors preserve selected city and search, retry recovers, and only successful empty hides the section', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('wasl-city', 'ankara'));
  const options = { error: true, empty: false };
  await mockInterests(page, options);
  await page.goto('/');
  const interests = page.getByRole('region', { name: 'Browse by interest' });
  await expect(interests.getByRole('alert')).toContainText('Interests could not load', {
    timeout: 15000,
  });
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(
    page.getByRole('searchbox', { name: 'Search communities and events' }),
  ).toBeEnabled();
  options.error = false;
  await interests.getByRole('button', { name: 'Retry' }).click();
  await expect(interests.getByRole('link', { name: 'Music' })).toBeVisible();
  options.empty = true;
  await page.reload();
  await expect(page.locator('#home-city')).toContainText('Ankara');
  await expect(interests).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search communities and events' }).fill('music');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?/);
  expect(new URL(page.url()).searchParams.get('city')).toBe('ankara');
});

for (const language of ['en', 'ar'] as const) {
  for (const width of [375, 1280]) {
    test(`six translated interests support keyboard focus at ${width}px in ${language}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((lang) => localStorage.setItem('wasl-language', lang), language);
      const categories = [
        music,
        art,
        {
          id: 'sports',
          nameEn: 'Sports and outdoor activities',
          nameAr: 'الرياضة والأنشطة الخارجية',
          nameTr: 'Spor',
        },
        { id: 'books', nameEn: 'Books', nameAr: 'الكتب', nameTr: 'Kitap' },
        { id: 'languages', nameEn: 'Languages', nameAr: 'اللغات', nameTr: 'Dil' },
        { id: 'technology', nameEn: 'Technology', nameAr: 'التقنية', nameTr: 'Teknoloji' },
      ];
      await mockInterests(page, { categories });
      await page.goto('/');
      const interests = page.getByRole('region', {
        name: language === 'ar' ? 'تصفح حسب الاهتمام' : 'Browse by interest',
      });
      await expect(interests.getByRole('link')).toHaveCount(6);
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const links = interests.getByRole('link');
      await links.first().focus();
      for (let index = 0; index < 6; index++) {
        await expect(links.nth(index)).toBeFocused();
        await expect(links.nth(index)).toHaveText(
            language === 'ar' ? categories[index]!.nameAr : categories[index]!.nameEn,
        );
        expect(
          await links.nth(index).evaluate((element) => getComputedStyle(element).outlineStyle),
        ).toBe('solid');
        expect((await links.nth(index).boundingBox())!.height).toBeGreaterThanOrEqual(44);
        if (index < 5) await page.keyboard.press('Tab');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await interests.screenshot({
        path: test.info().outputPath(`interests-${language}-${width}.png`),
      });
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/discover\?category=technology/);
    });
  }
}
