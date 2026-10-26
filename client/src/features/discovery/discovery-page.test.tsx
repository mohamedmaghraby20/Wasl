import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouter from 'react-router';
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  RouterProvider,
  createMemoryRouter,
  useLocation,
  useNavigate,
} from 'react-router';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { RootLayout } from '@/app/RootLayout';
import { DiscoveryPage } from './DiscoveryPage';
import { ResourceDetailsPage } from './ResourceDetailsPage';

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();
  return { ...actual, ScrollRestoration: () => null };
});

const communityResponse = {
  items: [
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
      categories: [{ id: 'education', nameEn: 'Education', nameAr: 'التعليم', nameTr: 'Eğitim' }],
    },
  ],
  page: 1,
  pageSize: 1,
  total: 1,
  hasMore: false,
};

const eventResponse = {
  items: [
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
      categories: [{ id: 'music', nameEn: 'Music', nameAr: 'الموسيقى', nameTr: 'Müzik' }],
    },
  ],
  page: 1,
  pageSize: 1,
  total: 1,
  hasMore: false,
};

function LocationOutput(): React.JSX.Element {
  const location = useLocation();
  return <output aria-label="Current URL">{`${location.pathname}${location.search}`}</output>;
}

function HistoryControls(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <>
      <button
        onClick={() => {
          void navigate(-1);
        }}
        type="button"
      >
        Back
      </button>
      <button
        onClick={() => {
          void navigate(1);
        }}
        type="button"
      >
        Forward
      </button>
    </>
  );
}

function renderPage(
  initialEntry = '/discover',
  component: React.ReactNode = <DiscoveryPage />,
  dataRouter = false,
): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const content = (
    <>
      {component}
      <LocationOutput />
      <HistoryControls />
    </>
  );
  const router = dataRouter
    ? createMemoryRouter([{ path: '*', element: content }], { initialEntries: [initialEntry] })
    : undefined;
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          {router ? (
            <RouterProvider router={router} />
          ) : (
            <MemoryRouter initialEntries={[initialEntry]}>{content}</MemoryRouter>
          )}
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

function mockDiscoveryApi(
  detailNotFound = false,
  hasMore = false,
): { submittedSearches: string[]; urls: URL[] } {
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
  const submittedSearches: string[] = [];
  const urls: URL[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    urls.push(url);
    let data: unknown = [];
    if (url.pathname.endsWith('/reference/cities'))
      data = [{ id: 'ankara', nameEn: 'Ankara', nameAr: 'Ankara', nameTr: 'Ankara' }];
    if (url.pathname.endsWith('/communities')) {
      const query = url.searchParams.get('q');
      if (query) submittedSearches.push(query);
      data = { ...communityResponse, hasMore };
    }
    if (url.pathname.endsWith('/events')) data = eventResponse;
    if (url.pathname.endsWith('/arab-students')) data = communityResponse.items[0];
    const notFound = detailNotFound && url.pathname.endsWith('/arab-students');
    return Promise.resolve({
      ok: !notFound,
      status: notFound ? 404 : 200,
      json: () => Promise.resolve(data),
    } as Response);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { submittedSearches, urls };
}

describe('DiscoveryPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows both public resource types on the unified discovery route', async () => {
    mockDiscoveryApi();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Arab students in Ankara' })).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Arabic music night' })).toBeVisible();
    expect(screen.getByLabelText('From date')).toBeVisible();
    expect(screen.getByLabelText('To date')).toBeVisible();
  });

  it('submits search into URL state and fetches both resource types with the query', async () => {
    const user = userEvent.setup();
    const { submittedSearches } = mockDiscoveryApi();
    renderPage();

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'music');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Arabic music night' })).toBeVisible();
    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover?q=music'),
    );
    expect(submittedSearches).toContain('music');
  });

  it('restores submitted search when navigating back and forward', async () => {
    const user = userEvent.setup();
    mockDiscoveryApi();
    renderPage();

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'music');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByLabelText('Current URL')).toHaveTextContent('?q=music'));

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover'),
    );
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Forward' }));
    await waitFor(() => expect(screen.getByLabelText('Current URL')).toHaveTextContent('?q=music'));
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('music');
  });

  it('supports keyboard-only search and filter navigation', async () => {
    const user = userEvent.setup();
    mockDiscoveryApi();
    renderPage();

    const search = screen.getByRole('searchbox', { name: 'Search' });
    await user.tab();
    expect(screen.getByRole('link', { name: 'Discover' })).toHaveFocus();
    for (let index = 0; index < 10 && !search.matches(':focus'); index += 1) await user.tab();
    expect(search).toHaveFocus();
    await user.keyboard('music');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear search' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Search' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByLabelText('Current URL')).toHaveTextContent('?q=music'));

    await user.tab();
    expect(screen.getByRole('combobox', { name: 'All cities' })).toHaveFocus();
  });

  it('uses the route parameter when loading a public detail page', async () => {
    mockDiscoveryApi();
    renderPage(
      '/communities/arab-students',
      <Routes>
        <Route path="/communities/:id" element={<ResourceDetailsPage kind="communities" />} />
      </Routes>,
    );

    expect(await screen.findByRole('heading', { name: 'Arab students in Ankara' })).toBeVisible();
  });

  it('reports a missing detail using the API status', async () => {
    mockDiscoveryApi(true);
    renderPage(
      '/communities/arab-students',
      <Routes>
        <Route path="/communities/:id" element={<ResourceDetailsPage kind="communities" />} />
      </Routes>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This community could not be found.',
    );
  });

  it('changes the city filter through the URL', async () => {
    const user = userEvent.setup();
    mockDiscoveryApi();
    renderPage();

    await user.click(screen.getByRole('combobox', { name: 'All cities' }));
    await user.click(await screen.findByRole('option', { name: 'Ankara' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover?city=ankara'),
    );
    expect(screen.getByRole('combobox', { name: 'City: Ankara' })).toHaveTextContent('Ankara');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover'),
    );
    expect(screen.getByRole('combobox', { name: 'All cities' })).toHaveTextContent('All cities');

    await user.click(screen.getByRole('button', { name: 'Forward' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover?city=ankara'),
    );
    expect(screen.getByRole('combobox', { name: 'City: Ankara' })).toHaveTextContent('Ankara');
  });

  it('requests twelve items per page and follows the server hasMore flag', async () => {
    const user = userEvent.setup();
    const { urls } = mockDiscoveryApi(false, true);
    renderPage('/communities');

    expect(await screen.findByRole('heading', { name: 'Arab students in Ankara' })).toBeVisible();
    expect(
      urls.some(
        (url) =>
          url.pathname.endsWith('/communities') && url.searchParams.get('pageSize') === '12',
      ),
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(
        urls.some(
          (url) => url.pathname.endsWith('/communities') && url.searchParams.get('page') === '2',
        ),
      ).toBe(true),
    );
  });

  it('uses distinct section headings and shows the server result count', async () => {
    mockDiscoveryApi();
    renderPage('/communities');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Community results' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Communities' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Communities' }),
    ).not.toBeInTheDocument();
    expect(await screen.findByText('1 result')).toBeVisible();
  });

  it('exposes active filters as removable chips and clears them', async () => {
    const user = userEvent.setup();
    mockDiscoveryApi();
    renderPage('/discover?q=music&city=ankara');

    const searchChip = await screen.findByRole('button', {
      name: 'Remove filter Search: music',
    });
    expect(
      await screen.findByRole('button', { name: 'Remove filter City: Ankara' }),
    ).toBeVisible();

    await user.click(searchChip);
    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover?city=ankara'),
    );
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover'),
    );
    expect(screen.getByRole('combobox', { name: 'All cities' })).toHaveTextContent('All cities');
  });

  it('moves focus to the main content after a route change', async () => {
    const user = userEvent.setup();
    mockDiscoveryApi();
    renderPage(
      '/',
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Link to="/discover">Open discover</Link>} />
          <Route path="/discover" element={<DiscoveryPage />} />
        </Route>
      </Routes>,
    );

    const main = screen.getByRole('main');
    expect(main).not.toHaveFocus();
    await user.click(screen.getByRole('link', { name: 'Open discover' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent('/discover'),
    );
    await waitFor(() => expect(main).toHaveFocus());
  });

  it('keeps document language and direction synchronized with Arabic', async () => {
    mockDiscoveryApi();
    renderPage(
      '/discover',
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/discover" element={<DiscoveryPage />} />
        </Route>
      </Routes>,
      true,
    );

    await act(async () => i18n.changeLanguage('ar'));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('lang', 'ar');
      expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    });
    await act(async () => i18n.changeLanguage('en'));
  });
});
