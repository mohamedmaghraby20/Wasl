import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { OrganizationManagePage } from './OrganizationManagePage';

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  mine: vi.fn(),
  managers: vi.fn(),
  invitations: vi.fn(),
  verificationRequests: vi.fn(),
  invite: vi.fn(),
  remove: vi.fn(),
  revoke: vi.fn(),
  transfer: vi.fn(),
  requestVerification: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/api/generated/organizations/organizations', () => ({
  getOrganizationsControllerListAdminInvitationsQueryKey: (id: string) => ['invitations', id],
  getOrganizationsControllerListManagersQueryKey: (id: string) => ['managers', id],
  getOrganizationsControllerListVerificationRequestsQueryKey: (id: string) => [
    'verification-requests',
    id,
  ],
  getOrganizationsControllerMineQueryKey: () => ['mine'],
  getOrganizationsControllerPublicProfileQueryKey: () => ['profile'],
  useOrganizationsControllerPublicProfile: mocks.profile,
  useOrganizationsControllerMine: mocks.mine,
  useOrganizationsControllerListManagers: mocks.managers,
  useOrganizationsControllerListAdminInvitations: mocks.invitations,
  useOrganizationsControllerListVerificationRequests: mocks.verificationRequests,
  useOrganizationsControllerCreateAdminInvitation: () => hook(mocks.invite()),
  useOrganizationsControllerRemoveAdmin: () => hook(mocks.remove()),
  useOrganizationsControllerRevokeAdminInvitation: () => hook(mocks.revoke()),
  useOrganizationsControllerTransferOwnership: () => hook(mocks.transfer()),
  useOrganizationsControllerRequestVerification: () => hook(mocks.requestVerification()),
}));

function hook(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

const organization = {
  id: 'organization-1',
  slug: 'wasl-students',
  name: 'Wasl Students',
  description: 'Student activities in Ankara.',
  type: 'Student association',
  cityId: null,
  cityName: null,
  locationName: null,
  websiteUrl: null,
  socialUrl: null,
  logoUrl: null,
  verificationStatus: 'PENDING' as const,
  resources: [],
};

const managerRows = [
  { userId: 'owner-1', displayName: 'Owner Name', role: 'OWNER' as const },
  { userId: 'admin-1', displayName: 'Admin Name', role: 'ADMIN' as const },
];

const invitationRows = [
  {
    id: 'invitation-1',
    targetUserId: 'invited-1',
    targetDisplayName: 'Invited Name',
    status: 'PENDING' as const,
    createdAt: '2026-10-20T10:00:00.000Z',
    expiresAt: '2026-10-27T10:00:00.000Z',
  },
];

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter initialEntries={['/organizations/wasl-students/manage']}>
            <Routes>
              <Route path="/organizations/:slug/manage" element={<OrganizationManagePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('OrganizationManagePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    await i18n.changeLanguage('en');
    mocks.useAuth.mockReturnValue({ user: { id: 'owner-1' }, loading: false });
    mocks.profile.mockReturnValue({
      data: organization,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.mine.mockReturnValue({
      data: [{ id: 'organization-1', slug: 'wasl-students', name: 'Wasl Students', role: 'OWNER' }],
      isPending: false,
    });
    mocks.managers.mockReturnValue({
      data: managerRows,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.invitations.mockReturnValue({
      data: invitationRows,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.verificationRequests.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.invite.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.remove.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.revoke.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.transfer.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.requestVerification.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('lets the owner remove an admin but never offers to remove the owner', async () => {
    const user = userEvent.setup();
    const removeAdmin = vi.fn().mockResolvedValue({ userId: 'admin-1' });
    mocks.remove.mockReturnValue({ mutateAsync: removeAdmin, isPending: false });
    renderPage();

    expect(screen.getByText('Owner Name')).toBeVisible();
    expect(screen.getAllByText('Admin Name')[0]).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Remove admin' })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Remove admin' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove admin' }));
    await waitFor(() =>
      expect(removeAdmin).toHaveBeenCalledWith({ id: 'organization-1', userId: 'admin-1' }),
    );
  });

  it('creates an invitation and shows the single-use acceptance link', async () => {
    const user = userEvent.setup();
    const inviteAdmin = vi.fn().mockResolvedValue({
      id: 'invitation-2',
      token: 'invitation-token',
      expiresAt: '2026-10-29T10:00:00.000Z',
    });
    mocks.invite.mockReturnValue({ mutateAsync: inviteAdmin, isPending: false });
    renderPage();

    await user.type(screen.getByLabelText('Email address'), 'invited@example.test');
    await user.click(screen.getByRole('button', { name: 'Create invitation' }));

    await waitFor(() =>
      expect(inviteAdmin).toHaveBeenCalledWith({
        id: 'organization-1',
        data: { targetEmail: 'invited@example.test' },
      }),
    );
    expect(
      await screen.findByText(/\/organizations\/invitations\/accept\?token=invitation-token$/),
    ).toBeVisible();
  });

  it('shows an admin the roster without owner-only controls', () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'admin-1' }, loading: false });
    mocks.mine.mockReturnValue({
      data: [{ id: 'organization-1', slug: 'wasl-students', name: 'Wasl Students', role: 'ADMIN' }],
      isPending: false,
    });
    renderPage();

    expect(screen.getByText('Admin Name')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Remove admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Invite an admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Transfer ownership' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only the organization owner can invite/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Edit organization' })).toHaveAttribute(
      'href',
      '/organizations/wasl-students/edit',
    );
  });

  it('does not reveal management controls to a user outside the organization', () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'outsider-1' }, loading: false });
    mocks.mine.mockReturnValue({ data: [], isPending: false });
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You do not have permission to manage this organization.',
    );
    expect(screen.queryByRole('heading', { name: 'Managers' })).not.toBeInTheDocument();
  });

  it('revokes a pending invitation for the owner', async () => {
    const user = userEvent.setup();
    const revokeInvitation = vi.fn().mockResolvedValue({ id: 'invitation-1', status: 'REVOKED' });
    mocks.revoke.mockReturnValue({ mutateAsync: revokeInvitation, isPending: false });
    renderPage();

    expect(screen.getByText('Invited Name')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() =>
      expect(revokeInvitation).toHaveBeenCalledWith({
        id: 'organization-1',
        invitationId: 'invitation-1',
      }),
    );
  });

  it('lets the owner transfer ownership to a selected admin after confirmation', async () => {
    const user = userEvent.setup();
    const transferOwnership = vi.fn().mockResolvedValue({
      id: 'organization-1',
      slug: 'wasl-students',
      ownerUserId: 'admin-1',
      previousOwnerRole: 'ADMIN',
    });
    mocks.transfer.mockReturnValue({ mutateAsync: transferOwnership, isPending: false });
    renderPage();

    await user.click(screen.getByLabelText('New owner'));
    await user.click(await screen.findByRole('option', { name: 'Admin Name' }));
    await user.click(screen.getByRole('button', { name: 'Transfer ownership' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText(
        'Transfer ownership to Admin Name? They will become the only owner and you will become an admin.',
      ),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Transfer ownership' }));

    await waitFor(() =>
      expect(transferOwnership).toHaveBeenCalledWith({
        id: 'organization-1',
        data: { targetUserId: 'admin-1' },
      }),
    );
  });

  it('lets a manager request verification with an optional note', async () => {
    const user = userEvent.setup();
    const requestVerification = vi.fn().mockResolvedValue({
      id: 'request-1',
      organizationId: 'organization-1',
      status: 'PENDING',
      requestNote: 'Please verify us.',
      decisionNote: null,
      createdAt: '2026-10-22T10:00:00.000Z',
      decidedAt: null,
    });
    mocks.requestVerification.mockReturnValue({
      mutateAsync: requestVerification,
      isPending: false,
    });
    renderPage();

    expect(screen.getByText('Verification pending')).toBeVisible();
    await user.type(screen.getByLabelText('Message for reviewers (optional)'), 'Please verify us.');
    await user.click(screen.getByRole('button', { name: 'Request verification' }));

    await waitFor(() =>
      expect(requestVerification).toHaveBeenCalledWith({
        id: 'organization-1',
        data: { note: 'Please verify us.' },
      }),
    );
  });

  it('shows a rejection note to managers without a verified badge', () => {
    mocks.profile.mockReturnValue({
      data: { ...organization, verificationStatus: 'REJECTED' },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.verificationRequests.mockReturnValue({
      data: [
        {
          id: 'request-1',
          organizationId: 'organization-1',
          status: 'REJECTED',
          requestNote: null,
          decisionNote: 'Add a public website before requesting again.',
          createdAt: '2026-10-20T10:00:00.000Z',
          decidedAt: '2026-10-21T10:00:00.000Z',
        },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText('Verification not approved')).toBeVisible();
    expect(
      screen.getByText('Reviewer note: Add a public website before requesting again.'),
    ).toBeVisible();
    expect(screen.queryByText('Wasl has verified this organization.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request verification' })).toBeVisible();
  });
});
