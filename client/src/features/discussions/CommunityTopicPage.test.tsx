import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CommunityTopicPage } from './CommunityTopicPage';

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'supabase-id' }, loading: false }),
}));

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter initialEntries={['/communities/community-1/topics/topic-1']}>
            <Routes>
              <Route path="/communities/:id/topics/:topicId" element={<CommunityTopicPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('CommunityTopicPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders public topic comments and posts an eligible one-level reply', async () => {
    let posted = false;
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes('/users/me'))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'member-1', displayName: 'Mariam' }),
        });
      if (url.includes('/membership'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ACTIVE' }) });
      if (url.endsWith('/communities/mine'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (options?.method === 'POST') {
        posted = true;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'reply-1' }) });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'topic-1',
            title: 'Introductions',
            body: 'Meet the community.',
            authorId: 'member-2',
            authorName: 'Ali',
            archived: false,
            createdAt: '2026-10-22T10:00:00Z',
            posts: {
              items: [
                {
                  id: 'root-1',
                  parentId: null,
                  authorId: 'member-2',
                  authorName: 'Ali',
                  body: 'Welcome!',
                  createdAt: '2026-10-22T11:00:00Z',
                  updatedAt: '2026-10-22T11:00:00Z',
                },
                ...(posted
                  ? [
                      {
                        id: 'reply-1',
                        parentId: 'root-1',
                        authorId: 'member-1',
                        authorName: 'Mariam',
                        body: 'Thank you!',
                        createdAt: '2026-10-22T12:00:00Z',
                        updatedAt: '2026-10-22T12:00:00Z',
                      },
                    ]
                  : []),
              ],
              page: 1,
              pageSize: 20,
              total: posted ? 2 : 1,
              hasMore: false,
              closed: false,
            },
          }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Introductions' })).toBeVisible();
    expect(screen.getByText('Welcome!')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Your comment' }), 'Thank you!');
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(await screen.findByText('Thank you!')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/communities/community-1/topics/topic-1/posts'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
