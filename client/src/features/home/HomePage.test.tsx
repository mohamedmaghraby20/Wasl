import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { HomePage } from './HomePage';

function SearchLocation(): React.JSX.Element {
  const location = useLocation();
  return <output aria-label="Current URL">{location.pathname + location.search}</output>;
}

function renderHome(): void {
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      );
      const items = url.pathname.endsWith('/communities')
        ? [
            {
              id: 'arab-students',
              slug: 'arab-students',
              name: 'Arab students in Ankara',
              description: 'A public student community.',
              admissionMode: 'open',
              capacity: null,
              hostName: 'Wasl Student Group',
              cityId: 'ankara',
              cityName: 'Ankara',
              categories: [],
            },
          ]
        : [
            {
              id: 'arabic-concert',
              slug: 'arabic-concert',
              title: 'Arabic music night',
              description: 'A public concert.',
              visibility: 'public',
              hostName: 'Wasl Events',
              hostType: 'organization',
              online: false,
              locationName: 'Ankara Hall',
              startsAt: '2026-11-01T18:00:00.000Z',
              endsAt: null,
              cancelled: false,
              capacity: null,
              admissionMode: 'open',
              cityId: 'ankara',
              cityName: 'Ankara',
              categories: [],
            },
          ];
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items, page: 1, pageSize: 3 }),
      } as Response);
    }),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/', element: <HomePage /> },
    { path: '/discover', element: <SearchLocation /> },
  ]);
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('HomePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows shared community and event cards and exposes a GET discovery search', async () => {
    renderHome();

    expect(await screen.findByRole('link', { name: 'Arab students in Ankara' })).toBeVisible();
    expect(await screen.findByRole('link', { name: 'Arabic music night' })).toBeVisible();
    const search = screen.getByRole('searchbox', { name: 'Search communities and events' });
    const form = search.closest('form');
    if (!form) throw new Error('The search field must be inside a form.');
    expect(form).toHaveAttribute('method', 'get');
    expect(new URL(form.action).pathname).toBe('/discover');
    expect(search).toHaveAttribute('name', 'q');
  });
});
