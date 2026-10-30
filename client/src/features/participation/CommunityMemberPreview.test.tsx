import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CommunityMemberPreview } from './CommunityMemberPreview';

const mocks = vi.hoisted(() => ({ preview: vi.fn() }));

vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerCommunityMemberPreview: mocks.preview,
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
    expect(within(screen.getAllByRole('listitem')[0]!).getByText('Host')).toBeVisible();
    expect(screen.getByText('+3 more')).toBeVisible();
    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.test/photo.jpg');
    expect(screen.getByText('B')).toBeVisible();
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/communities/community-1/members',
    );
  });
});
