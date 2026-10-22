import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { MyActivityPage } from './MyActivityPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useActivity: vi.fn(),
  leave: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/api/generated/participation/participation', () => ({
  useParticipationControllerMyActivity: mocks.useActivity,
  useParticipationControllerLeaveCommunity: () => ({ mutateAsync: mocks.leave, isPending: false }),
  useParticipationControllerCancelEventRegistration: () => ({
    mutateAsync: mocks.cancel,
    isPending: false,
  }),
}));

function renderPage(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/activity']}>
            <Routes>
              <Route path="/activity" element={<MyActivityPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('MyActivityPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.leave.mockResolvedValue({ status: 'LEFT' });
    mocks.cancel.mockResolvedValue({ status: 'CANCELLED_BY_USER' });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
  });

  it('shows both empty states when the user has no participation', () => {
    mocks.useActivity.mockReturnValue({
      data: { communities: [], events: [] },
      isPending: false,
      isError: false,
    });
    renderPage();

    expect(
      screen.getByText('You have not joined or requested to join a Community yet.'),
    ).toBeVisible();
    expect(screen.getByText('You have not registered for an Event yet.')).toBeVisible();
  });

  it('shows statuses and lets the user leave their own active community', async () => {
    const user = userEvent.setup();
    mocks.useActivity.mockReturnValue({
      data: {
        communities: [
          {
            id: 'community-1',
            slug: 'students',
            name: 'Student Circle',
            status: 'ACTIVE',
            requestedAt: '2026-10-01T00:00:00Z',
          },
        ],
        events: [
          {
            id: 'event-1',
            slug: 'meetup',
            title: 'Community meetup',
            startsAt: '2026-11-01T18:00:00Z',
            cancelled: false,
            status: 'WAITLISTED',
            requestedAt: '2026-10-01T00:00:00Z',
          },
        ],
      },
      isPending: false,
      isError: false,
    });
    renderPage();

    expect(screen.getByText('You are a community member')).toBeVisible();
    expect(screen.getByText('You are on the waitlist')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Leave community' }));
    expect(mocks.leave).toHaveBeenCalledWith({ id: 'community-1' });
    expect(screen.getByRole('link', { name: 'Community meetup' })).toHaveAttribute(
      'href',
      '/events/meetup',
    );
  });
});
