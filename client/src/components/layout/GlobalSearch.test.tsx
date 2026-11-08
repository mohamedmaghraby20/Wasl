import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '@/lib/i18n';
import { GlobalSearch } from './GlobalSearch';

function Location(): React.JSX.Element {
  const location = useLocation();
  return <output>{location.pathname + location.search}</output>;
}

function show(): void {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/events']}>
        <GlobalSearch />
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('GlobalSearch', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.removeItem('wasl-city');
  });

  it('opens and focuses search with Ctrl+K and closes with Escape', async () => {
    const user = userEvent.setup();
    show();
    await user.keyboard('{Control>}k{/Control}');
    const dialog = screen.getByRole('dialog', { name: 'Search communities and events' });
    expect(within(dialog).getByRole('searchbox')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with Command+K and searches using the saved city', async () => {
    const user = userEvent.setup();
    localStorage.setItem('wasl-city', 'ankara');
    show();
    await user.keyboard('{Meta>}k{/Meta}');
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('searchbox'), 'art');
    await user.click(within(dialog).getByRole('button', { name: 'Search' }));
    expect(
      screen.getByText(
        '/discover?q=art&upcoming=true&nonCancelled=true&cityScope=include-online&city=ankara',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
