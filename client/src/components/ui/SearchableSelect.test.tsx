import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { SearchableSelect } from './SearchableSelect';

describe('SearchableSelect', () => {
  it('exposes a searchable listbox and has no axe violations while open', async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <SearchableSelect
          id="city"
          value=""
          onValueChange={() => {}}
          options={[{ value: 'istanbul', label: 'Istanbul' }]}
          placeholder="Choose a city"
        />
      </I18nextProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Choose a city' }));
    expect(screen.getByRole('combobox')).toBeVisible();
    expect(screen.getByRole('listbox')).toBeVisible();
    expect((await axe(document.body)).violations).toHaveLength(0);
  });

  it('filters, clears while staying open, and closes on Escape without selecting', async () => {
    await i18n.changeLanguage('en');
    const user = userEvent.setup();
    const select = vi.fn();
    render(
      <SearchableSelect
        id="city"
        value=""
        onValueChange={select}
        options={[
          { value: 'istanbul', label: 'Istanbul' },
          { value: 'ankara', label: 'Ankara' },
        ]}
        placeholder="Choose a city"
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Choose a city' });
    await user.click(trigger);
    const input = screen.getByRole('combobox');
    await user.type(input, 'Ank');
    expect(screen.queryByRole('option', { name: 'Istanbul' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveFocus();
    expect(input).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await user.type(input, 'Ank');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(select).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
});
