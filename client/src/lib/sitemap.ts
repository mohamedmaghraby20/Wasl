export type SitemapResource = {
  id: string;
  slug?: string | null;
  visibility?: string | null;
  archived?: boolean | null;
  cancelled?: boolean | null;
};

export type SitemapResourceKind = 'communities' | 'events';

/** Public routes that exist for every visitor. Private routes are never listed here. */
export const STATIC_PATHS = ['/', '/discover', '/communities', '/events'] as const;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function isIndexableResource(kind: SitemapResourceKind, resource: SitemapResource): boolean {
  if (kind === 'communities') return resource.archived !== true;
  return resource.visibility === 'public' && resource.cancelled !== true;
}

export function canonicalResourcePath(
  kind: SitemapResourceKind,
  resource: SitemapResource,
): string {
  const key = resource.slug?.trim() || resource.id;
  return `/${kind}/${encodeURIComponent(key)}`;
}

export function sitemapUrls(
  origin: string,
  resources: { communities?: SitemapResource[]; events?: SitemapResource[] } = {},
): string[] {
  const base = normalizeOrigin(origin);
  const urls = STATIC_PATHS.map((path) => `${base}${path}`);
  for (const kind of ['communities', 'events'] as const) {
    for (const resource of resources[kind] ?? []) {
      if (isIndexableResource(kind, resource)) {
        urls.push(`${base}${canonicalResourcePath(kind, resource)}`);
      }
    }
  }
  return [...new Set(urls)];
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildSitemapXml(urls: string[]): string {
  const entries = urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}

/** Appends the sitemap reference to the existing robots rules without duplicating it. */
export function buildRobotsTxt(rules: string, origin: string): string {
  const base = normalizeOrigin(origin);
  const ruleLines = rules
    .split(/\r?\n/)
    .filter((line) => !/^\s*Sitemap:/i.test(line))
    .join('\n')
    .trimEnd();
  return `${ruleLines}\n\nSitemap: ${base}/sitemap.xml\n`;
}
