import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { OrganizationCreatePage } from './OrganizationCreatePage';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  cities: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/api/generated/organizations/organizations', () => ({
  useOrganizationsControllerCreate: () => ({ mutateAsync: mocks.create, isPending: false }),
}));
vi.mock('@/api/generated/discovery/discovery', () => ({
  useDiscoveryControllerCities: mocks.cities,
}));

function LocationOutput(): React.JSX.Element {
  const location = useLocation();
  return <output aria-label="Current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry = '/create/organization'): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/create/organization" element={<OrganizationCreatePage />} />
            <Route path="*" element={<LocationOutput />} />
          </Routes>
        </MemoryRouter>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('OrganizationCreatePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.cities.mockReturnValue({
      data: [{ id: 'ankara', nameEn: 'Ankara', nameAr: 'أنقرة', nameTr: 'Ankara' }],
      isError: false,
    });
    mocks.create.mockResolvedValue({ id: 'organization-1', slug: 'wasl-students' });
  });

  it('returns a signed-out visitor to sign in with this form as the return target', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    renderPage();

    expect(screen.getByLabelText('Current URL')).toHaveTextContent(
      '/sign-in?returnTo=%2Fcreate%2Forganization',
    );
  });

  it('validates required details and safe public links before submission', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    expect(mocks.create).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Organization name'), 'Wasl Students');
    await user.type(screen.getByLabelText('Description'), 'Student activities in Ankara.');
    await user.type(screen.getByLabelText('Organization type'), 'Student association');
    await user.type(screen.getByLabelText('Website'), 'example.test');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Website')).toBeInvalid();
  });

  it('creates through the generated contract and opens the returned public profile', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Organization name'), 'Wasl Students');
    await user.type(screen.getByLabelText('Description'), 'Student activities in Ankara.');
    await user.type(screen.getByLabelText('Organization type'), 'Student association');
    await user.click(screen.getByLabelText('City'));
    await user.click(await screen.findByRole('option', { name: 'Ankara' }));
    await user.type(screen.getByLabelText('Location (optional)'), 'Kızılay');
    await user.type(screen.getByLabelText('Website'), 'https://wasl.example.test');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        data: {
          name: 'Wasl Students',
          description: 'Student activities in Ankara.',
          type: 'Student association',
          cityId: 'ankara',
          locationName: 'Kızılay',
          websiteUrl: 'https://wasl.example.test',
          socialUrl: null,
        },
      }),
    );
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/organizations/wasl-students');
  });

  it('keeps the form visible and shows a clear error when creation fails', async () => {
    const user = userEvent.setup();
    mocks.create.mockRejectedValue(new Error('Request failed'));
    renderPage();

    await user.type(screen.getByLabelText('Organization name'), 'Wasl Students');
    await user.type(screen.getByLabelText('Description'), 'Student activities in Ankara.');
    await user.type(screen.getByLabelText('Organization type'), 'Student association');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your organization could not be created. Check your connection and try again.',
    );
    expect(screen.getByRole('heading', { name: 'Create an organization' })).toBeVisible();
  });
});
