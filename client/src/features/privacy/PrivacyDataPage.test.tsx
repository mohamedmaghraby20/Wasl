import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { PrivacyDataPage } from './PrivacyDataPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  status: vi.fn(),
  requests: vi.fn(),
  declareAge: vi.fn(),
  accept: vi.fn(),
  createRequest: vi.fn(),
  cancelRequest: vi.fn(),
  exportData: vi.fn(),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/api/generated/privacy/privacy', () => ({
  privacyControllerExportData: mocks.exportData,
  usePrivacyControllerStatus: mocks.status,
  usePrivacyControllerListRequests: mocks.requests,
  usePrivacyControllerDeclareAge: () => ({ mutateAsync: mocks.declareAge, isPending: false }),
  usePrivacyControllerAccept: () => ({ mutateAsync: mocks.accept, isPending: false }),
  usePrivacyControllerCreateRequest: () => ({
    mutateAsync: mocks.createRequest,
    isPending: false,
  }),
  usePrivacyControllerCancelRequest: () => ({
    mutateAsync: mocks.cancelRequest,
    isPending: false,
  }),
}));

const baseStatus = {
  ageEligibility: 'UNVERIFIED',
  ageVerificationMethod: 'SELF_DECLARATION',
  requiresOnboarding: true,
  documents: [],
  acceptedDocuments: [],
  openRequests: [],
};

const createdRequest = {
  id: 'request-new',
  requestType: 'DELETION',
  status: 'RECEIVED',
  requestNote: null,
  dueAt: '2026-11-27T10:00:00.000Z',
  identityVerifiedAt: '2026-10-28T10:00:00.000Z',
  decisionNote: null,
  decidedAt: null,
  completedAt: null,
  createdAt: '2026-10-28T10:00:00.000Z',
  updatedAt: '2026-10-28T10:00:00.000Z',
};

function renderPage(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/privacy']}>
            <Routes>
              <Route path="/privacy" element={<PrivacyDataPage />} />
              <Route path="/sign-in" element={<p>Sign in</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('PrivacyDataPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.status.mockReturnValue({ data: baseStatus, isPending: false, isError: false });
    mocks.requests.mockReturnValue({ data: [], isPending: false, isError: false });
    mocks.declareAge.mockResolvedValue(baseStatus);
    mocks.accept.mockResolvedValue(baseStatus);
    mocks.createRequest.mockResolvedValue(createdRequest);
    mocks.cancelRequest.mockResolvedValue({ ...createdRequest, status: 'CANCELLED' });
    mocks.exportData.mockResolvedValue({ schemaVersion: 1 });
  });

  afterEach(() => vi.restoreAllMocks());

  it('redirects signed-out visitors to sign in', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    renderPage();
    expect(screen.getByText('Sign in')).toBeVisible();
  });

  it('records the age confirmation only after the box is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    const confirm = screen.getByRole('button', { name: 'Confirm age' });
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole('checkbox', { name: 'I confirm that I am 18 years or older.' }),
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(mocks.declareAge).toHaveBeenCalledWith({ data: { isAdult: true } }));
  });

  it('accepts a published agreement for the current version', async () => {
    const user = userEvent.setup();
    mocks.status.mockReturnValue({
      data: {
        ...baseStatus,
        documents: [
          {
            id: 'document-1',
            type: 'TERMS_OF_USE',
            version: '2',
            locale: 'en',
            content: 'Approved terms text.',
            contentHash: 'hash',
            publishedAt: '2026-10-01T10:00:00.000Z',
          },
        ],
      },
      isPending: false,
      isError: false,
    });
    renderPage();

    expect(screen.getByText('Terms of use')).toBeVisible();
    expect(screen.getByText('Approved terms text.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() =>
      expect(mocks.accept).toHaveBeenCalledWith({
        data: { documentType: 'TERMS_OF_USE', version: '2' },
      }),
    );
  });

  it('explains the restriction for a recorded under-18 account', () => {
    mocks.status.mockReturnValue({
      data: { ...baseStatus, ageEligibility: 'UNDER_18' },
      isPending: false,
      isError: false,
    });
    renderPage();

    expect(screen.getByText('Under 18 recorded')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirm age' })).not.toBeInTheDocument();
  });

  it('requires confirmation before submitting a deletion request', async () => {
    const user = userEvent.setup();
    mocks.status.mockReturnValue({
      data: { ...baseStatus, ageEligibility: '18_PLUS', requiresOnboarding: false },
      isPending: false,
      isError: false,
    });
    renderPage();

    await user.click(screen.getByRole('combobox', { name: 'Request type' }));
    await user.click(await screen.findByRole('option', { name: 'Account deletion' }));
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Account deletion' }));

    await waitFor(() =>
      expect(mocks.createRequest).toHaveBeenCalledWith({
        data: { requestType: 'DELETION' },
      }),
    );
  });

  it('cancels an open request after confirmation', async () => {
    const user = userEvent.setup();
    mocks.requests.mockReturnValue({
      data: [{ ...createdRequest, requestType: 'ACCESS' }],
      isPending: false,
      isError: false,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Cancel request' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel request' }));

    await waitFor(() => expect(mocks.cancelRequest).toHaveBeenCalledWith({ id: 'request-new' }));
  });

  it('downloads the machine-readable export', async () => {
    const user = userEvent.setup();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:export'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Download JSON' }));

    await waitFor(() => expect(mocks.exportData).toHaveBeenCalled());
    expect(click).toHaveBeenCalled();
  });
});
