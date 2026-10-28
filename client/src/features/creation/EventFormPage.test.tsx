import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  // Radix Select mounts a portal and runs pointer-down/focus handling for each
  // choice, so this interaction regularly takes 2-3 s under jsdom and can cross
  // the 5 s default on a loaded machine.
  it('offers authorized organizations and keeps the selected host exclusive', async () => {
    const user = userEvent.setup();
    renderPage();

    const communityHost = screen.getByLabelText('Host this event as');
    const organizationHost = screen.getByLabelText('Organization (optional)');
    expect(communityHost).toHaveTextContent('My account');

    await user.click(organizationHost);
    expect(await screen.findByRole('option', { name: 'My group (Admin)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Unrelated/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'My group (Admin)' }));
    expect(organizationHost).toHaveTextContent('My group (Admin)');

    await user.click(communityHost);
    await user.click(await screen.findByRole('option', { name: 'My community' }));
    expect(communityHost).toHaveTextContent('My community');
    expect(organizationHost).toHaveTextContent('No organization');
  }, 20_000);
});
