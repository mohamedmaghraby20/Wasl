import { describe, expect, it } from 'vitest';
import { buildRobotsTxt, buildSitemapXml, sitemapUrls } from './sitemap';

describe('sitemapUrls', () => {
  it('lists static routes and indexable resources only', () => {
    const urls = sitemapUrls('https://wasl.example', {
      communities: [
        { id: 'c1', slug: 'readers' },
        { id: 'c2', slug: 'archived-club', archived: true },
      ],
      events: [
        { id: 'e1', slug: 'meetup', visibility: 'public' },
        { id: 'e2', slug: 'secret', visibility: 'unlisted' },
        { id: 'e3', slug: 'cancelled', visibility: 'public', cancelled: true },
      ],
    });

    expect(urls).toEqual([
      'https://wasl.example/',
      'https://wasl.example/discover',
      'https://wasl.example/communities',
      'https://wasl.example/events',
      'https://wasl.example/communities/readers',
      'https://wasl.example/events/meetup',
    ]);
  });

  it('falls back to the id when a resource has no slug', () => {
    const urls = sitemapUrls('https://wasl.example/', {
      events: [{ id: 'a3295dd6', visibility: 'public' }],
    });
    expect(urls).toContain('https://wasl.example/events/a3295dd6');
  });

  it('never repeats a URL', () => {
    const urls = sitemapUrls('https://wasl.example', {
      communities: [
        { id: 'c1', slug: 'readers' },
        { id: 'c1', slug: 'readers' },
      ],
    });
    expect(urls.filter((url) => url.endsWith('/communities/readers'))).toHaveLength(1);
  });
});

describe('buildSitemapXml', () => {
  it('emits a urlset with escaped locations', () => {
    const xml = buildSitemapXml(['https://wasl.example/?a=1&b=2']);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://wasl.example/?a=1&amp;b=2</loc>');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});

describe('buildRobotsTxt', () => {
  it('keeps the rules and appends one sitemap reference', () => {
    const robots = buildRobotsTxt('User-agent: *\nDisallow: /admin\n', 'https://wasl.example/');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap: https://wasl.example/sitemap.xml');
    expect(robots.match(/Sitemap:/g)).toHaveLength(1);
  });

  it('replaces a previous sitemap reference instead of adding another', () => {
    const robots = buildRobotsTxt(
      'User-agent: *\nSitemap: http://localhost:5173/sitemap.xml\n',
      'https://wasl.example',
    );
    expect(robots.match(/Sitemap:/g)).toHaveLength(1);
    expect(robots).toContain('Sitemap: https://wasl.example/sitemap.xml');
  });
});
