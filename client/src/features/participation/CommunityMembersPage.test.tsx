import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CommunityMembersPage } from './CommunityMembersPage';

const mocks = vi.hoisted(() => ({ members: vi.fn(), community: vi.fn(), attendees: vi.fn() }));

vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerCommunityMembers: mocks.members,
  useParticipationControllerEventAttendees: mocks.attendees,
}));
vi.mock('@/api/generated/discovery/discovery', () => ({
  useDiscoveryControllerCommunity: mocks.community,
  useDiscoveryControllerEvent: () => ({ data: { title: 'Language Meetup' } }),
}));
vi.mock('../discovery/usePageMetadata', () => ({ usePageMetadata: vi.fn() }));

function renderPage(kind: 'communities' | 'events' = 'communities'): ReturnType<typeof render> {
  const suffix = kind === 'events' ? 'attendees' : 'members';
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/${kind}/resource-1/${suffix}`]}>
        <QueryClientProvider client={new QueryClient()}>
          <Routes>
            <Route path={`/${kind}/:id/${suffix}`} element={<CommunityMembersPage kind={kind} />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('CommunityMembersPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    mocks.community.mockReturnValue({ data: { id: 'community-1', name: 'Language Circle' } });
    mocks.attendees.mockReturnValue({
      data: [{ userId: 'host-1', displayName: 'Event Host', avatarUrl: null, isHost: true }],
      isPending: false,
      isError: false,
    });
    mocks.members.mockReturnValue({
      data: [
        { userId: 'user-1', displayName: 'Samira', avatarUrl: null },
        { userId: 'user-2', displayName: 'Basim', avatarUrl: null },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('searches active members and links their profiles', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('link', { name: /Samira/ })).toHaveAttribute('href', '/users/user-1');
    expect(screen.getByText('Language Circle')).toBeVisible();
    await user.type(screen.getByRole('textbox', { name: 'Search members' }), 'bas');
    expect(screen.getByText('Basim')).toBeVisible();
    expect(screen.queryByText('Samira')).not.toBeInTheDocument();
  });

  it('uses event data and navigation on the attendee page', () => {
    renderPage('events');
    expect(screen.getByRole('heading', { name: 'Attendees' })).toBeVisible();
    expect(screen.getByText('Language Meetup')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to event' })).toHaveAttribute(
      'href',
      '/events/resource-1',
    );
    expect(screen.getByRole('textbox', { name: 'Search attendees' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Event Host/ })).toHaveAttribute(
      'href',
      '/users/host-1',
    );
  });
});
