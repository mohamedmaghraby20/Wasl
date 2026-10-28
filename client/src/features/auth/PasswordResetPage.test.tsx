import { createHead, UnheadProvider } from '@unhead/react/client';
import { I18nextProvider } from 'react-i18next';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { PasswordResetPage } from './PasswordResetPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('./AuthProvider', () => ({ useAuth: mocks.useAuth }));

function renderPage(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <MemoryRouter initialEntries={['/password-reset']}>
          <Routes>
            <Route path="/password-reset" element={<PasswordResetPage />} />
          </Routes>
        </MemoryRouter>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('PasswordResetPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      user: null,
      requestPasswordReset: mocks.requestPasswordReset,
      updatePassword: mocks.updatePassword,
    });
    mocks.requestPasswordReset.mockResolvedValue(undefined);
    mocks.updatePassword.mockResolvedValue(undefined);
    await act(async () => i18n.changeLanguage('en'));
  });

  it('requests a reset link without disclosing whether the account exists', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Email address'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('status')).toHaveTextContent('If an account matches that email');
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
  });

  it('updates the password after a recovery session is established', async () => {
    mocks.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      user: { id: 'user-1' },
      requestPasswordReset: mocks.requestPasswordReset,
      updatePassword: mocks.updatePassword,
    });
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('New password'), 'new-secure-password');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledWith('new-secure-password'));
    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been updated');
  });
});
