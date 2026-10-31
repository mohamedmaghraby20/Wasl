import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { OrganizerParticipationPanel } from './OrganizerParticipationPanel';
import { ApiError } from '@/api/fetcher';

const mocks = vi.hoisted(() => ({
  participants: vi.fn(),
  counts: vi.fn(),
  decision: vi.fn(),
}));

vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerCommunityParticipants: mocks.participants,
  useParticipationControllerEventParticipants: mocks.participants,
  useParticipationControllerCommunityCounts: mocks.counts,
  useParticipationControllerEventCounts: mocks.counts,
  useParticipationControllerCommunityDecision: () => ({
    mutateAsync: mocks.decision,
    isPending: false,
  }),
  useParticipationControllerEventDecision: () => ({
    mutateAsync: mocks.decision,
    isPending: false,
  }),
}));

function renderPanel(
  mode: 'all' | 'requests' | 'directory' = 'all',
  entry = '/',
  kind: 'communities' | 'events' = 'communities',
): ReturnType<typeof render> {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[entry]}>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <OrganizerParticipationPanel kind={kind} resourceId="community-1" mode={mode} />
        </QueryClientProvider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('OrganizerParticipationPanel', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.participants.mockReturnValue({
      data: [
        {
          id: 'membership-1',
          userId: 'user-1',
          displayName: 'Samira',
          avatarUrl: 'https://example.test/avatar.png',
          status: 'PENDING',
          requestedAt: '2026-10-01T00:00:00Z',
        },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.counts.mockReturnValue({
      data: { PENDING: 1, WAITLISTED: 0, ACTIVE: 3, capacity: 10, admissionMode: 'approval' },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.decision.mockResolvedValue({ status: 'ACTIVE' });
  });

  it('shows counts and sends an approval decision for a pending member', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText('Samira')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Samira' })).toHaveAttribute('href', '/users/user-1');
    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.test/avatar.png');
    expect(screen.getByText('Pending')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getByText('10')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveClass('size-9', 'hover:text-success');
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveClass('size-9', 'hover:text-danger');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(mocks.decision).toHaveBeenCalledWith({
      id: 'community-1',
      participantId: 'membership-1',
      action: 'approve',
    });
  });

  it('shows a community-specific empty state when there are no participants', () => {
    mocks.participants.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderPanel();
    expect(screen.getByText('This community does not have any participants yet.')).toBeVisible();
  });

  it('hides the request preview and disables participant loading when both queues are empty', () => {
    mocks.counts.mockReturnValue({
      data: { PENDING: 0, WAITLISTED: 0, ACTIVE: 4 },
      isPending: false,
      isError: false,
    });
    const { container } = renderPanel('requests');
    expect(container).toBeEmptyDOMElement();
    expect(mocks.participants).toHaveBeenNthCalledWith(1, 'community-1', {
      query: { enabled: false },
    });
  });

  it('shows only five waiting participants in compact rows with a see-all link', () => {
    mocks.counts.mockReturnValue({
      data: { PENDING: 6, WAITLISTED: 1, ACTIVE: 1, admissionMode: 'approval' },
      isPending: false,
      isError: false,
    });
    mocks.participants.mockReturnValue({
      data: Array.from({ length: 8 }, (_, index) => ({
        id: `request-${index}`,
        userId: `user-${index}`,
        displayName: `Person ${index}`,
        avatarUrl: null,
        status: index === 7 ? 'ACTIVE' : index === 6 ? 'WAITLISTED' : 'PENDING',
      })),
      isPending: false,
      isError: false,
    });
    const { container } = renderPanel('requests');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByText('Person 7')).not.toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/communities/community-1/participants?status=PENDING',
    );
  });

  it('opens the waitlist filter from the URL and supports search and promotion', async () => {
    const user = userEvent.setup();
    mocks.counts.mockReturnValue({
      data: { PENDING: 1, WAITLISTED: 2, ACTIVE: 1, admissionMode: 'approval' },
      isPending: false,
      isError: false,
    });
    mocks.participants.mockReturnValue({
      data: [
        { id: 'pending-1', userId: 'user-1', displayName: 'Pending Person', status: 'PENDING' },
        { id: 'waiting-1', userId: 'user-2', displayName: 'Samira', status: 'WAITLISTED' },
        { id: 'waiting-2', userId: 'user-3', displayName: 'Basim', status: 'WAITLISTED' },
      ],
      isPending: false,
      isError: false,
    });
    renderPanel('directory', '/communities/community-1/participants?status=WAITLISTED');
    expect(screen.queryByText('Pending Person')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search participants' }), 'sam');
    expect(screen.getByText('Samira')).toBeVisible();
    expect(screen.queryByText('Basim')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Promote from waitlist' }));
    expect(mocks.decision).toHaveBeenCalledWith({
      id: 'community-1',
      participantId: 'waiting-1',
      action: 'promote',
    });
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await user.click(
      within(screen.getByRole('navigation', { name: 'Participant status' })).getByRole('button', {
        name: /Pending/,
      }),
    );
    expect(screen.getByText('Pending Person')).toBeVisible();
    expect(screen.queryByText('Samira')).not.toBeInTheDocument();
  });

  it('keeps waitlist promotion compact and named in the request preview', async () => {
    mocks.counts.mockReturnValue({
      data: { PENDING: 0, WAITLISTED: 1, ACTIVE: 1, admissionMode: 'approval' },
      isPending: false,
      isError: false,
    });
    mocks.participants.mockReturnValue({
      data: [{ id: 'waiting-1', userId: 'user-1', displayName: 'Samira', status: 'WAITLISTED' }],
      isPending: false,
      isError: false,
    });
    renderPanel('requests');
    const promote = screen.getByRole('button', { name: 'Promote from waitlist' });
    expect(promote).toHaveClass('size-9', 'hover:text-success');
    expect(promote).toHaveAttribute('title', 'Promote from waitlist');
    expect(promote).toHaveTextContent('');
    await userEvent.click(promote);
    expect(mocks.decision).toHaveBeenCalledWith({ id: 'community-1', participantId: 'waiting-1', action: 'promote' });
  });

  it('uses the same review controls for event registration decisions', async () => {
    const user = userEvent.setup();
    renderPanel('directory', '/events/community-1/participants?status=PENDING', 'events');
    const reject = screen.getByRole('button', { name: 'Reject' });
    expect(reject).toHaveTextContent('');
    expect(reject.querySelector('svg')).not.toBeNull();
    await user.click(reject);
    expect(mocks.decision).toHaveBeenCalledWith({
      id: 'community-1',
      participantId: 'membership-1',
      action: 'reject',
    });
  });

  it('does not display participant rows when the server denies organizer access', () => {
    mocks.counts.mockReturnValue({
      isError: true,
      isPending: false,
      error: new ApiError('Forbidden', 403),
    });
    renderPanel('directory');
    expect(screen.getByText('Only organizers can manage participants.')).toBeVisible();
    expect(screen.queryByText('Samira')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
