import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CommunityTopics } from './CommunityTopics';

function renderTopics(canPost: boolean): void {
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/communities/community-1']}>
          <Routes>
            <Route
              path="/communities/:id"
              element={<CommunityTopics communityId="community-1" canPost={canPost} />}
            />
            <Route path="/communities/:id/topics/:topicId" element={<p>New topic opened</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('CommunityTopics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists public topics and hides creation for ineligible visitors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [
                { id: 'topic-1', title: 'Introductions', body: 'Say hello', authorName: 'Ali' },
              ],
              hasMore: false,
            }),
        }),
      ),
    );
    renderTopics(false);
    expect(await screen.findByRole('link', { name: 'Introductions' })).toHaveAttribute(
      'href',
      '/communities/community-1/topics/topic-1',
    );
    expect(screen.queryByRole('button', { name: 'Create topic' })).not.toBeInTheDocument();
  });

  it('lets an eligible member create a topic and opens it', async () => {
    const fetchMock = vi.fn((_url: string, options?: RequestInit) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            options?.method === 'POST' ? { id: 'new-topic' } : { items: [], hasMore: false },
          ),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderTopics(true);
    await screen.findByText('No topics yet.');
    await userEvent.type(screen.getByRole('textbox', { name: 'Topic title' }), 'Introductions');
    await userEvent.type(
      screen.getByRole('textbox', { name: 'What would you like to discuss?' }),
      'Say hello',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create topic' }));
    expect(await screen.findByText('New topic opened')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/communities/community-1/topics'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
