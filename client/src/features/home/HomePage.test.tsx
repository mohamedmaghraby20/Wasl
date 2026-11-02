import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { HomePage } from './HomePage';

function SearchLocation(): React.JSX.Element {
  const location = useLocation();
  return <output aria-label="Current URL">{location.pathname + location.search}</output>;
}

const community = {
  id: 'arab-students',
  slug: 'arab-students',
  name: 'Arab students in Ankara',
  description: 'A public student community.',
  admissionMode: 'open',
  memberCount: 12,
  capacity: null,
  hostName: 'Wasl Student Group',
  cityId: 'ankara',
  cityName: 'Ankara',
  categories: [],
};

const inPersonEvent = {
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
  acceptedRegistrationCount: 0,
  admissionMode: 'open',
  cityId: 'ankara',
  cityName: 'Ankara',
  categories: [],
};

const onlineEvent = {
  id: 'online-poetry',
  slug: 'online-poetry',
  title: 'Online Arabic poetry evening',
  description: 'A public online gathering.',
  visibility: 'public',
  hostName: 'Wasl Events',
  hostType: 'organization',
  online: true,
  locationName: null,
  startsAt: '2026-11-02T18:00:00.000Z',
  endsAt: null,
  cancelled: false,
  capacity: null,
  acceptedRegistrationCount: 0,
  admissionMode: 'open',
  cityId: null,
  cityName: null,
  categories: [],
};

function renderHome(
  options: {
    citiesError?: boolean;
    eventsEmpty?: boolean;
    eventsLoading?: boolean;
    communitiesLoading?: boolean;
    communitiesEmpty?: boolean;
    communitiesError?: boolean;
    onlineEmpty?: boolean;
    onlineError?: boolean;
    onlineLoading?: boolean;
    onlineRequests?: URL[];
  } = {},
): void {
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'http://localhost:3000',
      );
      if (url.pathname.endsWith('/reference/cities'))
        return Promise.resolve({
          ok: !options.citiesError,
          status: options.citiesError ? 503 : 200,
          json: () =>
            Promise.resolve([
              { id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' },
            ]),
        } as Response);
      if (url.pathname.endsWith('/communities') && options.communitiesLoading)
        return new Promise<Response>(() => {});
      if (url.pathname.endsWith('/communities') && options.communitiesError)
        return Promise.resolve({
          ok: false,
          status: 503,
          json: () => Promise.resolve({}),
        } as Response);
      if (url.pathname.endsWith('/events')) {
        const online = url.searchParams.get('modality') === 'online';
        if (online) options.onlineRequests?.push(url);
        if (online && options.onlineError)
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () => Promise.resolve({ message: 'Unavailable' }),
          } as Response);
        if (online ? options.onlineLoading : options.eventsLoading)
          return new Promise<Response>(() => {});
        const items = online
          ? options.onlineEmpty
            ? []
            : [onlineEvent]
          : options.eventsEmpty
            ? []
            : [inPersonEvent];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items,
              page: 1,
              pageSize: 4,
              total: items.length,
              hasMore: false,
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: url.pathname.endsWith('/communities') && !options.communitiesEmpty ? [community] : [],
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

  it('keeps successful events visible while communities load independently', async () => {
    renderHome({ communitiesLoading: true });
    expect(await screen.findByRole('link', { name: 'Arabic music night' })).toBeVisible();
    const section = screen.getByRole('region', { name: 'Communities across Türkiye' });
    expect(within(section).getByRole('status')).toHaveTextContent('Loading');
    expect(within(section).queryByText('Nothing here yet')).not.toBeInTheDocument();
  });

  it('shows a nationwide community empty state independently of successful events', async () => {
    renderHome({ communitiesEmpty: true });
    const section = screen.getByRole('region', { name: 'Communities across Türkiye' });
    expect(await within(section).findByText('Nothing here yet')).toBeVisible();
    expect(within(section).queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Arabic music night' })).toBeVisible();
  });

  it('retries a community error without blocking events and renders the recovered aggregate', async () => {
    const options = { communitiesError: true };
    renderHome(options);
    const section = screen.getByRole('region', { name: 'Communities across Türkiye' });
    expect(await within(section).findByRole('alert')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Arabic music night' })).toBeVisible();
    options.communitiesError = false;
    await userEvent.click(within(section).getByRole('button', { name: 'Retry' }));
    expect(await within(section).findByText('12 members')).toBeVisible();
  });

  it('keeps online events nationwide when a city is remembered and links to online-only discovery', async () => {
    localStorage.setItem('wasl-city', 'ankara');
    const onlineRequests: URL[] = [];
    renderHome({ onlineRequests });

    const section = await screen.findByRole('region', { name: 'Upcoming online events' });
    expect(
      await within(section).findByRole('link', { name: 'Online Arabic poetry evening' }),
    ).toHaveAttribute('href', '/events/online-poetry');
    expect(within(section).getByText('Online')).toBeVisible();
    expect(within(section).getByRole('link', { name: 'Explore all' })).toHaveAttribute(
      'href',
      '/events?modality=online&upcoming=true&nonCancelled=true',
    );

    const request = onlineRequests.at(-1);
    if (!request) throw new Error('The online event collection must request events.');
    expect(request.searchParams.get('modality')).toBe('online');
    expect(request.searchParams.get('upcoming')).toBe('true');
    expect(request.searchParams.get('nonCancelled')).toBe('true');
    expect(request.searchParams.get('pageSize')).toBe('4');
    expect(request.searchParams.has('city')).toBe(false);
  });

  it('shows an independent online loading state without blocking other collections', async () => {
    renderHome({ onlineLoading: true });

    const section = await screen.findByRole('region', { name: 'Upcoming online events' });
    expect(within(section).getByRole('status')).toHaveTextContent('Loading upcoming online events');
    expect(await screen.findByRole('link', { name: 'Arabic music night' })).toBeVisible();
    expect(await screen.findByRole('link', { name: 'Arab students in Ankara' })).toBeVisible();
  });

  it('hides the online collection only after a successful empty response', async () => {
    renderHome({ onlineEmpty: true });

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Upcoming online events' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole('link', { name: 'Arabic music night' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps a failed online collection retryable and separate from other results', async () => {
    const user = userEvent.setup();
    const options = { onlineError: true };
    renderHome(options);

    const section = await screen.findByRole('region', { name: 'Upcoming online events' });
    expect(await within(section).findByRole('alert')).toHaveTextContent(
      'Could not load upcoming online events',
    );
    expect(await screen.findByRole('link', { name: 'Arabic music night' })).toBeVisible();

    options.onlineError = false;
    await user.click(within(section).getByRole('button', { name: 'Retry' }));
    expect(
      await within(section).findByRole('link', { name: 'Online Arabic poetry evening' }),
    ).toBeVisible();
  });
});
