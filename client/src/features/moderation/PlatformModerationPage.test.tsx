import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/fetcher';
import { i18n } from '@/lib/i18n';
import { PlatformModerationPage } from './PlatformModerationPage';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  list: vi.fn(),
  verification: vi.fn(),
  assurance: vi.fn(),
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
});
