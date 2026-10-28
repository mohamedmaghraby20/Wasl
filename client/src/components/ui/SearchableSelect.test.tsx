import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
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
});
