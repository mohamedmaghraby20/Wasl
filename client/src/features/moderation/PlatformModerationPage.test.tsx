import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/fetcher';
import { i18n } from '@/lib/i18n';
import { PlatformModerationPage } from './PlatformModerationPage';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  list: vi.fn(),
  verification: vi.fn(),
  assurance: vi.fn(),
  privacy: vi.fn(),
  privacyDecide: vi.fn(),
  privacyRetry: vi.fn(),
}));
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.auth }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { mfa: { getAuthenticatorAssuranceLevel: mocks.assurance } } },
}));
vi.mock('@/api/generated/moderation/moderation', () => ({
  useModerationControllerList: mocks.list,
  useModerationControllerDecide: () => ({ mutateAsync: vi.fn() }),
  getModerationControllerListQueryKey: () => ['reports'],
}));
vi.mock('@/api/generated/organizations/organizations', () => ({
  useOrganizationsControllerListPendingVerificationRequests: mocks.verification,
  useOrganizationsControllerDecideVerification: () => ({ mutateAsync: vi.fn() }),
  getOrganizationsControllerListPendingVerificationRequestsQueryKey: () => ['verification'],
}));
vi.mock('@/api/generated/privacy/privacy', () => ({
  usePrivacyAdminControllerList: mocks.privacy,
  usePrivacyAdminControllerDecide: () => ({ mutateAsync: mocks.privacyDecide }),
  usePrivacyAdminControllerRetry: () => ({ mutateAsync: mocks.privacyRetry }),
  getPrivacyAdminControllerListQueryKey: () => ['privacy-admin'],
}));

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/admin" element={<PlatformModerationPage />} />
              <Route path="/sign-in" element={<p>Sign in</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('PlatformModerationPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.auth.mockReturnValue({ user: { id: 'admin' }, loading: false });
    mocks.assurance.mockResolvedValue({ data: { currentLevel: 'aal2' } });
    mocks.list.mockReturnValue({ isPending: false, isError: false, data: [] });
    mocks.verification.mockReturnValue({ isPending: false, isError: false, data: [] });
    mocks.privacy.mockReturnValue({ isPending: false, isError: false, data: [] });
    mocks.privacyDecide.mockResolvedValue({});
    mocks.privacyRetry.mockResolvedValue({});
  });
  it('redirects signed-out visitors', () => {
    mocks.auth.mockReturnValue({ user: null, loading: false });
    renderPage();
    expect(screen.getByText('Sign in')).toBeVisible();
  });
  it('shows no internal report details on an API denial', async () => {
    mocks.list.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError('Forbidden', 403),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Platform administrator access'),
    );
    expect(screen.queryByText('Reports awaiting review')).not.toBeInTheDocument();
  });
  it('shows empty review queues to authorized administrators', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('No open reports.')).toBeVisible());
    expect(screen.getByText('No pending verification requests.')).toBeVisible();
  });
  it('shows privacy requests with the requester and records a decision', async () => {
    const user = userEvent.setup();
    mocks.privacy.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'request-1',
          requestType: 'ACCESS',
          status: 'RECEIVED',
          requestNote: 'Please send my data.',
          dueAt: '2026-11-27T10:00:00.000Z',
          requesterEmail: 'member@example.com',
          identityVerifiedAt: '2026-10-28T10:00:00.000Z',
          decisionNote: null,
          decidedAt: null,
          completedAt: null,
          createdAt: '2026-10-28T10:00:00.000Z',
          updatedAt: '2026-10-28T10:00:00.000Z',
        },
      ],
    });
    vi.spyOn(window, 'prompt').mockReturnValue('Handled by support');
    renderPage();

    expect(await screen.findByText('member@example.com', { exact: false })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Approve request' }));
    await waitFor(() =>
      expect(mocks.privacyDecide).toHaveBeenCalledWith({
        id: 'request-1',
        data: { action: 'APPROVE', note: 'Handled by support' },
      }),
    );
  });
  afterEach(() => vi.restoreAllMocks());
});
