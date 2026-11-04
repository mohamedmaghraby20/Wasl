import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { RootLayout } from './RootLayout';

const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: auth.useAuth }));
vi.mock('@/api/generated/privacy/privacy', () => ({ usePrivacyControllerStatus: () => ({}) }));

function renderLayout(): void {
  const router = createMemoryRouter([{ path: '/', element: <RootLayout /> }]);
  render(
    <I18nextProvider i18n={i18n}>
      <UnheadProvider head={createHead()}>
        <RouterProvider router={router} />
      </UnheadProvider>
    </I18nextProvider>,
  );
}

describe('RootLayout navigation', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    auth.useAuth.mockReturnValue({ user: { email: 'member@example.com' }, loading: false, signOut: vi.fn() });
  });

  it('shows direct message and notification links without duplicating them in the account menu', async () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/messages');
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/notifications');

    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    const menu = screen.getByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: /messages|notifications|create/i })).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /profile/i })).toBeVisible();
  });

  it('does not show private shortcuts to signed-out visitors', () => {
    auth.useAuth.mockReturnValue({ user: null, loading: false });
    renderLayout();
    expect(screen.queryByRole('link', { name: 'Messages' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});
