import { createHead, UnheadProvider } from '@unhead/react/client';
import { I18nextProvider } from 'react-i18next';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { AuthPage, safeReturnPath } from './AuthPage';

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('./AuthProvider', () => ({
  useAuth: authMocks.useAuth,
  authErrorMessage: (_error: unknown, messages: { generic: string }) => messages.generic,
}));

function LocationOutput(): React.JSX.Element {
  const location = useLocation();
  return <output aria-label="Current URL">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(initialEntry: string): void {
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/sign-in" element={<AuthPage />} />
            <Route path="/sign-up" element={<AuthPage />} />
            <Route path="*" element={<LocationOutput />} />
          </Routes>
        </MemoryRouter>
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('AuthPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    authMocks.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      user: null,
      signIn: authMocks.signIn,
      signUp: authMocks.signUp,
    });
    authMocks.signIn.mockResolvedValue(undefined);
    authMocks.signUp.mockResolvedValue(false);
    await act(async () => i18n.changeLanguage('en'));
  });

  it('returns to the requested internal page after sign-in', async () => {
    const user = userEvent.setup();
    renderPage('/sign-in?returnTo=%2Fcommunities%2Fstudents%3Fcity%3Dankara');

    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Current URL')).toHaveTextContent(
        '/communities/students?city=ankara',
      ),
    );
    expect(authMocks.signIn).toHaveBeenCalledWith('person@example.com', 'correct-horse-battery');
  });

  it('confirms when sign-up requires an email link', async () => {
    const user = userEvent.setup();
    renderPage('/sign-up');

    await user.type(screen.getByLabelText('Name shown on your profile'), 'New Member');
    await user.type(screen.getByLabelText('Email address'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-enough-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Check new@example.com');
    expect(authMocks.signUp).toHaveBeenCalledWith(
      'New Member',
      'new@example.com',
      'long-enough-password',
      '/',
    );
  });

  it('rejects external return targets', () => {
    expect(safeReturnPath('?returnTo=https%3A%2F%2Fevil.example')).toBe('/');
    expect(safeReturnPath('?returnTo=%2F%2Fevil.example')).toBe('/');
    expect(safeReturnPath('?returnTo=%2Fdiscover%3Fq%3Dmusic')).toBe('/discover?q=music');
  });
});
