import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { OrganizationEditPage } from './OrganizationEditPage';

const mocks = vi.hoisted(() => ({
  cities: vi.fn(),
  profile: vi.fn(),
  update: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/api/generated/discovery/discovery', () => ({
  useDiscoveryControllerCities: mocks.cities,
}));
vi.mock('@/api/generated/organizations/organizations', () => ({
  getOrganizationsControllerPublicProfileQueryKey: (slug: string) => ['organization', slug],
  useOrganizationsControllerPublicProfile: mocks.profile,
  useOrganizationsControllerUpdate: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

const organization = {
  id: 'organization-1',
  slug: 'wasl-students',
  name: 'Wasl Students',
  description: 'Student activities in Ankara.',
  type: 'Student association',
  cityId: 'ankara',
  cityName: 'Ankara',
  locationName: 'Kızılay',
  websiteUrl: 'https://wasl.example.test',
  socialUrl: null,
  logoUrl: null,
  verificationStatus: 'PENDING' as const,
  resources: [],
};

function LocationOutput(): React.JSX.Element {
  return <output aria-label="Current URL">{useLocation().pathname}</output>;
}

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/organizations/wasl-students/edit']}>
            <Routes>
              <Route path="/organizations/:slug/edit" element={<OrganizationEditPage />} />
              <Route path="*" element={<LocationOutput />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('OrganizationEditPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.cities.mockReturnValue({
      data: [{ id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' }],
      isError: false,
    });
    mocks.profile.mockReturnValue({
      data: organization,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.update.mockResolvedValue(organization);
  });

  it('returns a signed-out visitor to sign in with this edit route as the return target', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    renderPage();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/sign-in');
  });

  it('loads the public values and updates through the generated server-authorized contract', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText('Organization name')).toHaveValue('Wasl Students');
    await user.clear(screen.getByLabelText('Organization name'));
    await user.type(screen.getByLabelText('Organization name'), 'Wasl Graduate Students');
    await user.click(screen.getByRole('button', { name: 'Save organization' }));

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        id: 'organization-1',
        data: {
          name: 'Wasl Graduate Students',
          description: 'Student activities in Ankara.',
          type: 'Student association',
          cityId: 'ankara',
          locationName: 'Kızılay',
          websiteUrl: 'https://wasl.example.test',
          socialUrl: null,
        },
        params: { lang: 'en' },
      }),
    );
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/organizations/wasl-students');
  });

  it('keeps the form visible when the server rejects management permission', async () => {
    const user = userEvent.setup();
    const { ApiError } = await import('@/api/fetcher');
    mocks.update.mockRejectedValue(new ApiError('Forbidden', 403));
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Save organization' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to manage this organization.',
    );
    expect(screen.getByRole('heading', { name: 'Edit organization' })).toBeVisible();
  });
});
