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

function renderHome(
  options: { citiesError?: boolean; eventsEmpty?: boolean; eventsLoading?: boolean } = {},
): void {
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'http://localhost:3000',
      );
      if (url.pathname.endsWith('/discovery/categories'))
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      if (url.pathname.endsWith('/reference/cities'))
        return Promise.resolve({
          ok: !options.citiesError,
          status: options.citiesError ? 503 : 200,
          json: () =>
            Promise.resolve([
              { id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' },
            ]),
        } as Response);
      if (url.pathname.endsWith('/events') && options.eventsLoading)
        return new Promise<Response>(() => {});
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
        json: () =>
          Promise.resolve({
            items: url.pathname.endsWith('/events') && options.eventsEmpty ? [] : items,
            page: 1,
            pageSize: 4,
          }),
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
    localStorage.removeItem('wasl-city');
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

  it('keeps search and successful discovery usable when city reference loading fails', async () => {
    renderHome({ citiesError: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('Cities could not load');
    expect(screen.getByRole('searchbox', { name: 'Search communities and events' })).toBeEnabled();
    expect(await screen.findByRole('link', { name: 'Arabic music night' })).toBeVisible();
  });

  it('keeps communities visible while the event section loads', async () => {
    renderHome({ eventsLoading: true });
    expect(await screen.findByRole('link', { name: 'Arab students in Ankara' })).toBeVisible();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('distinguishes a successfully empty nationwide collection from a loading or error state', async () => {
    renderHome({ eventsEmpty: true });
    expect(await screen.findByText('Nothing here yet')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
