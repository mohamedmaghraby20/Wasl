import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { OrganizationProfilePage } from './OrganizationProfilePage';

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const organization = {
  id: 'org-1',
  slug: 'wasl-students',
  name: 'Wasl Students',
  logoUrl: null,
  description: 'A public organization for students in Ankara.',
  type: 'Student organization',
  cityId: 'ankara',
  cityName: 'Ankara',
  locationName: 'Kızılay',
  websiteUrl: 'https://wasl.example.org',
  socialUrl: 'https://social.example.org/wasl',
  verificationStatus: 'VERIFIED' as const,
  resources: [
    { kind: 'community' as const, slug: 'arab-students', name: 'Arab students in Ankara' },
    { kind: 'event' as const, slug: 'study-night', name: 'Study night' },
  ],
};

function renderPage(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/organizations/wasl-students']}>
            <Routes>
              <Route path="/organizations/:slug" element={<OrganizationProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

function mockOrganizationApi(response: unknown, status = 200): void {
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
      }),
    ),
  );
}

describe('OrganizationProfilePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows the public organization identity, verified state, external links and resource links', async () => {
    mockOrganizationApi(organization);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Wasl Students' })).toBeVisible();
    expect(screen.getByText('Verified organization')).toBeVisible();
    expect(screen.getByText('Kızılay, Ankara')).toBeVisible();
    expect(screen.getByRole('link', { name: /website/i })).toHaveAttribute(
      'href',
      'https://wasl.example.org/',
    );
    expect(screen.getByRole('link', { name: 'Arab students in Ankara' })).toHaveAttribute(
      'href',
      '/communities/arab-students',
    );
    expect(screen.getByRole('link', { name: 'Study night' })).toHaveAttribute(
      'href',
      '/events/study-night',
    );
  });

  it('shows the empty public resources state', async () => {
    mockOrganizationApi({ ...organization, resources: [], websiteUrl: null, socialUrl: null });
    renderPage();

    expect(
      await screen.findByText('This organization has no public communities or events yet.'),
    ).toBeVisible();
  });

  it('shows a distinct not-found state for a missing organization', async () => {
    mockOrganizationApi({}, 404);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This organization could not be found.',
    );
  });
});
