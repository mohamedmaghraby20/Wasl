import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { OrganizerParticipationPanel } from './OrganizerParticipationPanel';

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

function renderPanel(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <OrganizerParticipationPanel kind="communities" resourceId="community-1" />
      </QueryClientProvider>
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
    expect(screen.getByText('Pending')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getByText('10')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(mocks.decision).toHaveBeenCalledWith({
      id: 'community-1',
      participantId: 'membership-1',
      action: 'approve',
    });
  });
});
