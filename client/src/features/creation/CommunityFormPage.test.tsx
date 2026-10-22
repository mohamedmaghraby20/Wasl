import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CommunityFormPage } from './CommunityFormPage';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  categories: vi.fn(),
  cities: vi.fn(),
  community: vi.fn(),
  create: vi.fn(),
  mineCommunities: vi.fn(),
  mineOrganizations: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.auth }));
vi.mock('@/api/generated/communities/communities', () => ({
  useCommunitiesControllerCreate: mocks.create,
  useCommunitiesControllerUpdate: mocks.update,
}));
vi.mock('@/api/generated/organizations/organizations', () => ({
  useOrganizationsControllerMine: mocks.mineOrganizations,
}));
vi.mock('@/api/generated/discovery/discovery', () => ({
  useDiscoveryControllerCategories: mocks.categories,
  useDiscoveryControllerCities: mocks.cities,
  useDiscoveryControllerCommunity: mocks.community,
}));

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/create/community']}>
            <Routes>
              <Route path="/create/community" element={<CommunityFormPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('CommunityFormPage organization host choice', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.auth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.categories.mockReturnValue({ data: [], isError: false });
    mocks.cities.mockReturnValue({ data: [], isError: false });
    mocks.community.mockReturnValue({ data: undefined, isPending: false, isError: false });
    mocks.create.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.update.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('offers only organizations returned by the authorized current-user API', () => {
    mocks.mineOrganizations.mockReturnValue({
      data: [
        { id: 'org-owner', slug: 'owner-group', name: 'Owner Group', role: 'OWNER' },
        { id: 'org-admin', slug: 'admin-group', name: 'Admin Group', role: 'ADMIN' },
      ],
      isError: false,
    });
    renderPage();

    const host = screen.getByLabelText('Organization (optional)');
    expect(host).toHaveDisplayValue('My account');
    expect(screen.getByRole('option', { name: 'Owner Group (Owner)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Admin Group (Admin)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Unrelated/ })).not.toBeInTheDocument();
  });
});
