import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { EventFormPage } from './EventFormPage';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  categories: vi.fn(),
  cities: vi.fn(),
  communities: vi.fn(),
  create: vi.fn(),
  event: vi.fn(),
  mineOrganizations: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.auth }));
vi.mock('@/api/generated/communities/communities', () => ({
  useCommunitiesControllerMine: mocks.communities,
}));
vi.mock('@/api/generated/events/events', () => ({
  useEventsControllerCreate: mocks.create,
  useEventsControllerUpdate: mocks.update,
}));
vi.mock('@/api/generated/organizations/organizations', () => ({
  useOrganizationsControllerMine: mocks.mineOrganizations,
}));
vi.mock('@/api/generated/discovery/discovery', () => ({
  useDiscoveryControllerCategories: mocks.categories,
  useDiscoveryControllerCities: mocks.cities,
  useDiscoveryControllerEvent: mocks.event,
}));

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/create/event']}>
            <Routes>
              <Route path="/create/event" element={<EventFormPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('EventFormPage organization host choice', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.auth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.categories.mockReturnValue({ data: [], isError: false });
    mocks.cities.mockReturnValue({ data: [], isError: false });
    mocks.communities.mockReturnValue({
      data: [{ id: 'community-1', name: 'My community' }],
      isError: false,
    });
    mocks.create.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.event.mockReturnValue({ data: undefined, isPending: false, isError: false });
    mocks.mineOrganizations.mockReturnValue({
      data: [{ id: 'org-1', slug: 'my-group', name: 'My group', role: 'ADMIN' }],
      isError: false,
    });
    mocks.update.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('offers authorized organizations and keeps the selected host exclusive', () => {
    renderPage();

    const communityHost = screen.getByLabelText('Host this event as');
    const organizationHost = screen.getByLabelText('Organization (optional)');
    expect(screen.getByRole('option', { name: 'My group (Admin)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Unrelated/ })).not.toBeInTheDocument();

    fireEvent.change(communityHost, { target: { value: 'community-1' } });
    expect(communityHost).toHaveValue('community-1');
    fireEvent.change(organizationHost, { target: { value: 'org-1' } });
    expect(organizationHost).toHaveValue('org-1');
    expect(communityHost).toHaveValue('');
  });
});
