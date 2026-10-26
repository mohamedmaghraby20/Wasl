import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const list = { items: [], page: 1, pageSize: 12, total: 0, hasMore: false };

test.use({ contextOptions: { reducedMotion: 'reduce' } });

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = list;
    if (url.pathname.endsWith('/reference/cities')) {
      data = [
        { id: 'ankara', nameEn: 'Ankara', nameAr: 'Ankara', nameTr: 'Ankara' },
        { id: 'istanbul', nameEn: 'Istanbul', nameAr: 'Istanbul', nameTr: 'Istanbul' },
      ];
    } else if (url.pathname.endsWith('/reference/categories')) {
      data = [];
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

test('home search focus uses a single outline', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  const input = page.getByRole('searchbox', { name: 'Search' });
  await input.focus();
  const styles = await input.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderColor: style.borderColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
    };
  });
  expect(styles.outlineStyle).toBe('solid');
  expect(styles.outlineWidth).toBe('1px');
  expect(styles.outlineOffset).toBe('-1px');
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/home-search-focus.png',
    fullPage: false,
  });
});

test('selection colors are readable', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.evaluate(() => {
    const heading = document.querySelector('h1');
    if (!heading) return;
    const range = document.createRange();
    range.selectNodeContents(heading);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/selection.png',
    fullPage: false,
  });
});

test('city picker searches and compact date picker stays stable within the viewport', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/discover');
  await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();

  await page.getByRole('combobox', { name: 'All cities' }).click();
  const citySearch = page.getByRole('searchbox', { name: /Search cities/ });
  await citySearch.fill('Ank');
  expect((await citySearch.boundingBox())!.height).toBe(36);
  await expect(page.getByRole('option', { name: 'Ankara' })).toBeVisible();
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/city-search.png',
    fullPage: false,
  });
  await page.getByRole('option', { name: 'Ankara' }).click();
  await expect(page.getByRole('listbox')).not.toBeVisible();

  const fromTrigger = page.getByRole('button', { name: /From date/ });
  await fromTrigger.click();
  await expect.poll(async () => (await page.getByRole('dialog').boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
  const firstBox = await page.getByRole('dialog').boundingBox();
  const triggerBox = await page.getByRole('button', { name: /From date/, includeHidden: true }).boundingBox();
  expect(firstBox).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(firstBox!.y).toBeGreaterThanOrEqual(0);
  expect(firstBox!.y + firstBox!.height).toBeLessThanOrEqual(812);
  expect(firstBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height);
  expect(firstBox!.width).toBeLessThanOrEqual(280);
  expect(firstBox!.x).toBeGreaterThanOrEqual(0);
  expect(firstBox!.x + firstBox!.width).toBeLessThanOrEqual(375);
  const scrollPosition = await page.evaluate(() => window.scrollY);
  await page.mouse.move(360, 100);
  await page.mouse.wheel(0, 300);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollPosition);
  expect(await page.getByRole('dialog').evaluate((element) => getComputedStyle(element).scrollbarWidth)).toBe('none');

  for (let index = 0; index < 3; index += 1) {
    await page.getByRole('button', { name: 'Go to the Next Month' }).click();
  }
  const januaryBox = await page.getByRole('dialog').boundingBox();
  expect(januaryBox!.y).toBeCloseTo(firstBox!.y, 0);
  expect(januaryBox!.height).toBeCloseTo(firstBox!.height, 0);
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/date-picker-january-375.png',
    fullPage: false,
  });
});

test('date pickers fit a 320px viewport', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/discover');
  await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();

  const fromTrigger = page.getByRole('button', { name: /From date/ });
  await fromTrigger.click();
  const fromBox = await page.getByRole('dialog').boundingBox();
  expect(fromBox!.x).toBeGreaterThanOrEqual(0);
  expect(fromBox!.x + fromBox!.width).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/date-picker-from-320.png',
    fullPage: false,
  });
  await page.keyboard.press('Escape');

  const toTrigger = page.getByRole('button', { name: /To date/ });
  await toTrigger.click();
  const toBox = await page.getByRole('dialog').boundingBox();
  expect(toBox!.x).toBeGreaterThanOrEqual(0);
  expect(toBox!.x + toBox!.width).toBeLessThanOrEqual(320);
  expect(toBox!.y).toBeGreaterThanOrEqual(0);
  expect(toBox!.y + toBox!.height).toBeLessThanOrEqual(760);
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/date-picker-to-320.png',
    fullPage: false,
  });
});

test('mobile navigation icons align with labels', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const links = page.getByRole('dialog').getByRole('link');
  const count = await links.count();
  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    const icon = link.locator('svg').first();
    if ((await icon.count()) === 0) continue;
    const [linkBox, iconBox, textBox] = await Promise.all([
      link.boundingBox(),
      icon.boundingBox(),
      link.locator('span').first().boundingBox(),
    ]);
    if (!linkBox || !iconBox || !textBox) continue;
    expect(Math.abs(iconBox.y + iconBox.height / 2 - (textBox.y + textBox.height / 2))).toBeLessThan(2);
  }
  await page.screenshot({
    path: 'C:/Users/seif/AppData/Local/Temp/opencode/mobile-nav.png',
    fullPage: false,
  });
});
