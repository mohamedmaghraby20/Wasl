import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { OrganizationInvitationAcceptPage } from './OrganizationInvitationAcceptPage';

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/api/generated/organizations/organizations', () => ({
  getOrganizationsControllerMineQueryKey: () => ['mine'],
  useOrganizationsControllerAcceptAdminInvitation: () => hook(mocks.accept()),
}));

function hook(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function renderPage(entry = '/organizations/invitations/accept?token=invitation-token'): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter initialEntries={[entry]}>
            <Routes>
              <Route
                path="/organizations/invitations/accept"
                element={<OrganizationInvitationAcceptPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('OrganizationInvitationAcceptPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.useAuth.mockReturnValue({ user: { id: 'invited-1' }, loading: false });
    mocks.accept.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('accepts the invitation through the personal account and links to organization management', async () => {
    const user = userEvent.setup();
    const acceptInvitation = vi.fn().mockResolvedValue({
      organizationId: 'organization-1',
      organizationSlug: 'wasl-students',
      role: 'ADMIN',
    });
    mocks.accept.mockReturnValue({ mutateAsync: acceptInvitation, isPending: false });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Accept invitation' }));

    await waitFor(() =>
      expect(acceptInvitation).toHaveBeenCalledWith({ data: { token: 'invitation-token' } }),
    );
    expect(await screen.findByText('You are now an admin of this organization.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to organization' })).toHaveAttribute(
      'href',
      '/organizations/wasl-students/manage',
    );
  });

  it('shows an error when the invitation token is missing from the link', () => {
    renderPage('/organizations/invitations/accept');

    expect(screen.getByRole('alert')).toHaveTextContent('This invitation link is incomplete.');
  });

  it('keeps the invitation usable when the server rejects it', async () => {
    const user = userEvent.setup();
    const { ApiError } = await import('@/api/fetcher');
    const acceptInvitation = vi.fn().mockRejectedValue(new ApiError('Expired', 409));
    mocks.accept.mockReturnValue({ mutateAsync: acceptInvitation, isPending: false });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Accept invitation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation could not be accepted.',
    );
    expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
  });
});
