import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { NotificationsPage } from './NotificationsPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  list: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/api/generated/notifications/notifications', () => ({
  useNotificationsControllerList: mocks.list,
  useNotificationsControllerMarkRead: () => ({ mutateAsync: mocks.markRead, isPending: false }),
  getNotificationsControllerListQueryKey: () => ['/api/v1/notifications'],
}));

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/notifications']}>
            <Routes>
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/sign-in" element={<p>Sign in</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.useAuth.mockReturnValue({ user: { id: 'member' }, loading: false });
    mocks.markRead.mockResolvedValue({});
  });

  it('gates signed-out visitors', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    mocks.list.mockReturnValue({ isPending: true });
    renderPage();
    expect(screen.getByText('Sign in')).toBeVisible();
  });

  it('shows loading feedback', () => {
    mocks.list.mockReturnValue({ isPending: true });
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading notifications');
  });

  it('shows an error with a retry action', () => {
    mocks.list.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Could not load notifications. Try again.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  it('shows an empty notification list', () => {
    mocks.list.mockReturnValue({ isPending: false, isError: false, data: [] });
    renderPage();
    expect(screen.getByText('No notifications yet')).toBeVisible();
  });

  it('links a privacy decision to the privacy page', () => {
    mocks.list.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'privacy-notice',
          type: 'privacy_request_decided',
          readAt: '2026-10-02T12:00:00Z',
          createdAt: '2026-10-01T12:00:00Z',
          href: '/privacy',
        },
      ],
    });
    renderPage();
    expect(screen.getByText('There is a response to your privacy request')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/privacy');
  });

  it('links to the resolved resource and marks unread items', async () => {
    mocks.list.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'notice',
          type: 'event_accepted',
          readAt: null,
          createdAt: '2026-10-01T12:00:00Z',
          href: '/events/meetup',
        },
      ],
    });
    renderPage();
    expect(screen.getByText('Your event registration was accepted')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/events/meetup',
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(mocks.markRead).toHaveBeenCalledWith({ id: 'notice' });
  });
});
