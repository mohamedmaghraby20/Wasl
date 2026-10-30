import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { ResourceDetailsPage } from './ResourceDetailsPage';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => auth }));
vi.mock('./usePageMetadata', () => ({ usePageMetadata: vi.fn() }));

function renderCommunity(viewer: 'owner' | 'member' | 'visitor'): void {
  auth.user = viewer === 'visitor' ? null : { id: viewer };
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const url = new URL(input);
      let data: unknown = {};
      if (url.pathname === '/api/v1/communities/language-circle')
        data = {
          id: 'community-1',
          slug: 'language-circle',
          name: 'Language Circle',
          description: 'A welcoming local community.',
          admissionMode: 'open',
          capacity: 30,
          hostName: 'Samira',
          ownerType: 'user',
          ownerId: 'owner',
          cityId: 'istanbul',
          cityName: 'Istanbul',
          memberCount: 2,
          categories: [],
        };
      if (url.pathname === '/api/v1/users/me') data = { id: viewer };
      if (url.pathname === '/api/v1/users/owner')
        data = { id: 'owner', displayName: 'Samira', avatarUrl: null };
      if (url.pathname.endsWith('/membership'))
        data = { status: viewer === 'member' ? 'ACTIVE' : null };
      if (url.pathname.endsWith('/participation-counts'))
        data = { PENDING: 0, WAITLISTED: 0, ACTIVE: 1, capacity: '30', admissionMode: 'open' };
      if (url.pathname.endsWith('/member-preview'))
        data = {
          host: { userId: 'owner', displayName: 'Samira', avatarUrl: null },
          total: 2,
          members: [],
        };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      } as Response);
    }),
  );
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/communities/language-circle']}>
          <Routes>
            <Route path="/communities/:id" element={<ResourceDetailsPage kind="communities" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('Community detail viewer controls', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('offers edit and archive only to the owner', async () => {
    renderCommunity('owner');
    expect(await screen.findByRole('link', { name: 'Edit community' })).toHaveAttribute(
      'href',
      '/communities/community-1/edit',
    );
    expect(screen.getByRole('button', { name: 'Archive community' })).toBeVisible();
    expect(screen.getByText('Hosted by you')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Membership requests' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave community' })).not.toBeInTheDocument();
  });

  it('offers leaving and community chat to active members', async () => {
    renderCommunity('member');
    expect(await screen.findByRole('button', { name: 'Leave community' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open chat' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Edit community' })).not.toBeInTheDocument();
  });

  it('offers sign-in to join and keeps member identities private for visitors', async () => {
    renderCommunity('visitor');
    expect(await screen.findByRole('link', { name: 'Join community' })).toHaveAttribute(
      'href',
      expect.stringContaining('/sign-in?returnTo='),
    );
    expect(screen.getByText('Join this community to view its members.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Edit community' })).not.toBeInTheDocument();
  });
});
