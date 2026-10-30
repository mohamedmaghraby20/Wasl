import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CommunityMemberPreview } from './CommunityMemberPreview';
import type { CommunityPublicDto } from '@/api/generated/wasl-client.schemas';

const mocks = vi.hoisted(() => ({ preview: vi.fn() }));

vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerCommunityMemberPreview: mocks.preview,
}));
vi.mock('@/api/generated/users/users', () => ({
  useUsersControllerPublicProfile: () => ({ data: undefined }),
}));

describe('CommunityMemberPreview', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    mocks.preview.mockReturnValue({
      data: {
        total: 6,
        host: { userId: 'host-1', displayName: 'Host Name', avatarUrl: null },
        members: [
          { userId: 'user-1', displayName: 'Samira', avatarUrl: 'https://example.test/photo.jpg' },
          { userId: 'user-2', displayName: 'Basim', avatarUrl: null },
        ],
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('shows a linked member preview and a link to the full list', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <QueryClientProvider client={new QueryClient()}>
            <CommunityMemberPreview communityId="community-1" />
          </QueryClientProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(screen.getByRole('link', { name: /Samira/ })).toHaveAttribute('href', '/users/user-1');
    expect(screen.getByRole('heading', { name: 'Organizers' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Message' })).toHaveAttribute(
      'href',
      '/messages?to=host-1',
    );
    expect(screen.queryByText('+3 more')).not.toBeInTheDocument();
    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.test/photo.jpg');
    expect(screen.getByText('B')).toBeVisible();
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/communities/community-1/members',
    );
  });

  it('does not request or display private member identities for visitors', () => {
    const community = {
      ownerId: 'public-host',
      ownerType: 'user',
      hostName: 'Public Host',
      memberCount: 12,
    } as CommunityPublicDto;
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <QueryClientProvider client={new QueryClient()}>
            <CommunityMemberPreview
              communityId="community-1"
              community={community}
              canViewMembers={false}
            />
          </QueryClientProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(mocks.preview).toHaveBeenLastCalledWith('community-1', { query: { enabled: false } });
    expect(screen.getByText('Join this community to view its members.')).toBeVisible();
    expect(screen.queryByText('Samira')).not.toBeInTheDocument();
  });
});
