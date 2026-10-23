import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { EventDiscussion } from './EventDiscussion';

function renderDiscussion(canPost = false): void {
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <EventDiscussion eventId="event-1" canPost={canPost} signedIn={canPost} />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('EventDiscussion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows public comments, a removed comment placeholder, and paginated replies', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            url.includes('page=2')
              ? {
                  items: [
                    {
                      id: 'reply',
                      parentId: 'root',
                      authorId: 'user-2',
                      authorName: 'Mariam',
                      body: null,
                      createdAt: '2026-10-22T12:00:00Z',
                    },
                  ],
                  page: 2,
                  pageSize: 20,
                  hasMore: false,
                }
              : {
                  items: [
                    {
                      id: 'root',
                      parentId: null,
                      authorId: 'user-1',
                      authorName: 'Ali',
                      body: 'See you there!',
                      createdAt: '2026-10-22T11:00:00Z',
                    },
                  ],
                  page: 1,
                  pageSize: 20,
                  hasMore: true,
                },
          ),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderDiscussion();

    expect(await screen.findByText('See you there!')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ali' })).toHaveAttribute('href', '/users/user-1');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('This comment was removed.')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything());
  });

  it('offers a clear empty state when an event has no posts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })),
    );
    renderDiscussion();
    expect(await screen.findByText('No comments yet.')).toBeVisible();
  });

  it('posts an eligible reply and refreshes the discussion', async () => {
    let posted = false;
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        posted = true;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'reply' }) });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: 'root',
                parentId: null,
                authorId: 'user-1',
                authorName: 'Ali',
                body: 'First comment',
                createdAt: '2026-10-22T11:00:00Z',
              },
              ...(posted
                ? [
                    {
                      id: 'reply',
                      parentId: 'root',
                      authorId: 'user-2',
                      authorName: 'Mariam',
                      body: 'See you there!',
                      createdAt: '2026-10-22T12:00:00Z',
                    },
                  ]
                : []),
            ],
            page: 1,
            pageSize: 20,
            total: posted ? 2 : 1,
            hasMore: false,
          }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderDiscussion(true);

    await screen.findByText('First comment');
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByText('Replying to Ali')).toBeVisible();
    await userEvent.type(screen.getByRole('textbox', { name: 'Your comment' }), 'See you there!');
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(await screen.findByText('See you there!')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Mariam' })).toHaveAttribute('href', '/users/user-2');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/events/event-1/discussion'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ body: 'See you there!', parentId: 'root' }),
      }),
    );
  });
});
