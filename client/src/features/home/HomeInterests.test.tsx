import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { HomeInterests } from './HomeInterests';

const music = { id: 'music', nameEn: 'Music', nameAr: 'الموسيقى', nameTr: 'Müzik' };

function renderInterests(fetcher: typeof fetch, cityId = '') {
  vi.stubGlobal('fetch', fetcher);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <HomeInterests cityId={cityId} />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('HomeInterests', () => {
  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage('en');
  });

  it('renders translated reference labels as city-scoped combined discovery links', async () => {
    await i18n.changeLanguage('ar');
    renderInterests(
      vi.fn(() => Promise.resolve(new Response(JSON.stringify([music])))),
      'ankara',
    );
    const link = await screen.findByRole('link', { name: 'الموسيقى' });
    expect(link).toHaveAttribute(
      'href',
      '/discover?category=music&city=ankara&upcoming=true&nonCancelled=true&cityScope=include-online',
    );
  });

  it('keeps a named loading section until the response succeeds, then hides a successful empty section', async () => {
    let resolve!: (response: Response) => void;
    const response = new Promise<Response>((done) => {
      resolve = done;
    });
    renderInterests(vi.fn(() => response));
    expect(screen.getByRole('region', { name: 'Browse by interest' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Loading categories');
    await act(async () => {
      resolve(new Response('[]'));
      await response;
    });
    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument());
  });

  it('keeps failure visible and supports retry independently of reference categories', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([music])));
    renderInterests(fetcher);
    expect(await screen.findByRole('alert')).toHaveTextContent('Interests could not load');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const region = screen.getByRole('region', { name: 'Browse by interest' });
    expect(await within(region).findByRole('link', { name: 'Music' })).toHaveAttribute(
      'href',
      '/discover?category=music&upcoming=true&nonCancelled=true&cityScope=include-online',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
