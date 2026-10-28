import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildRobotsTxt,
  buildSitemapXml,
  sitemapUrls,
  type SitemapResource,
} from '../src/lib/sitemap.ts';

const distDir = join(import.meta.dirname, '..', 'dist');
const origin = process.env.PUBLIC_WEB_ORIGIN?.trim() || 'http://localhost:5173';
const apiBase = (process.env.SITEMAP_API_URL ?? process.env.VITE_API_URL ?? 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');

type Page = { items: SitemapResource[]; hasMore?: boolean };

async function loadResources(kind: 'communities' | 'events'): Promise<SitemapResource[]> {
  const items: SitemapResource[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const response = await fetch(`${apiBase}/api/v1/${kind}?page=${page}&pageSize=100`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`${kind} request failed with ${response.status}`);
    const body = (await response.json()) as Page;
    items.push(...body.items);
    if (!body.hasMore) break;
  }
  return items;
}

async function main(): Promise<void> {
  const resources: { communities: SitemapResource[]; events: SitemapResource[] } = {
    communities: [],
    events: [],
  };
  try {
    resources.communities = await loadResources('communities');
    resources.events = await loadResources('events');
  } catch (error) {
    // A build without a reachable API still ships a valid sitemap of public routes.
    console.warn(
      `[sitemap] could not read public resources from ${apiBase}: ${(error as Error).message}`,
    );
  }

  const urls = sitemapUrls(origin, resources);
  await writeFile(join(distDir, 'sitemap.xml'), buildSitemapXml(urls), 'utf8');

  const rules = await readFile(join(import.meta.dirname, '..', 'public', 'robots.txt'), 'utf8');
  await writeFile(join(distDir, 'robots.txt'), buildRobotsTxt(rules, origin), 'utf8');

  console.log(
    `[sitemap] wrote ${urls.length} URLs for ${origin} (${resources.communities.length} communities, ${resources.events.length} events read)`,
  );
}

await main();
