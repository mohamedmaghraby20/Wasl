import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityPublicDto } from '@/api/generated/wasl-client.schemas';
import { i18n } from '@/lib/i18n';
import { CommunityDetailsLayout, defaultCommunityCover } from './CommunityDetailsLayout';

vi.mock('@/features/participation/CommunityMemberPreview', () => ({
  CommunityMemberPreview: () => <p>Organizer sidebar</p>,
}));
vi.mock('@/features/participation/CommunityMembersTab', () => ({
  CommunityMembersTab: () => <p>Member directory</p>,
}));
vi.mock('@/features/discussions/CommunityTopics', () => ({
  CommunityTopics: () => <p>Discussion content</p>,
}));
vi.mock('./CommunityEvents', () => ({ CommunityEvents: () => <p>Community event list</p> }));
vi.mock('@/features/participation/ParticipationQueueLinks', () => ({
  ParticipationQueueLinks: () => null,
}));

const community: CommunityPublicDto = {
  id: 'community-1',
  slug: 'language-circle',
  name: 'Language Circle',
  description: 'Practice languages and meet your neighbours.',
  admissionMode: 'open',
  capacity: 50,
  hostName: 'Samira',
  ownerType: 'user',
  ownerId: 'host',
  cityId: 'istanbul',
  cityName: 'Istanbul',
  memberCount: 8,
  categories: [],
};

function renderLayout(owner = false, member = false): void {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/communities/language-circle']}>
        <CommunityDetailsLayout
          item={community}
          canManage={owner}
          canViewMembers={owner || member}
          viewerId={owner ? 'host' : 'viewer'}
          membershipAction={<button>Join community</button>}
          managementActions={<button>Edit community</button>}
          managementPanel={<p>Manage requests</p>}
          chatAction={null}
          onCopyShare={vi.fn()}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('CommunityDetailsLayout', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('uses a stable local cover and provides working share links', () => {
    renderLayout();
    expect(defaultCommunityCover('community-1')).toBe(defaultCommunityCover('community-1'));
    expect(screen.getByAltText('Illustrative community gathering')).toHaveAttribute(
      'src',
      defaultCommunityCover('community-1'),
    );
    expect(screen.getByRole('link', { name: 'Share on Facebook' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('/communities/language-circle')),
    );
    expect(screen.getByRole('button', { name: 'Join community' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Edit community' })).not.toBeInTheDocument();
  });

  it('navigates the four sections without showing a photos tab', async () => {
    const user = userEvent.setup();
    renderLayout(true);
    const navigation = screen.getByRole('navigation', { name: 'Community sections' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'About us' })).toBeVisible();
    expect(screen.getByText('Hosted by you')).toBeVisible();
    expect(screen.queryByText('Manage requests')).not.toBeInTheDocument();
    await user.click(within(navigation).getByRole('link', { name: 'Events' }));
    expect(screen.getByText('Community event list')).toBeVisible();
    expect(screen.queryByText('Manage requests')).not.toBeInTheDocument();
    expect(screen.queryByText(community.description)).not.toBeInTheDocument();
    await user.click(within(navigation).getByRole('link', { name: 'Members' }));
    expect(screen.getByText('Member directory')).toBeVisible();
    expect(screen.getByText('Manage requests')).toBeVisible();
    await user.click(within(navigation).getByRole('link', { name: 'Discussion' }));
    expect(screen.getByText('Discussion content')).toBeVisible();
    expect(screen.queryByText('Manage requests')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit community' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Join community' })).not.toBeInTheDocument();
  });

  it('keeps the member directory private for visitors', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Community sections' })).getByRole('link', {
        name: 'Members',
      }),
    );
    expect(screen.getByText('Join this community to view its members.')).toBeVisible();
    expect(screen.queryByText('Member directory')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage requests')).not.toBeInTheDocument();
  });
});
