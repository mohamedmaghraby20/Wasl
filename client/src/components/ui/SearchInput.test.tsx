import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('filters as typed and clears without submitting, keeping keyboard focus', async () => {
    await i18n.changeLanguage('en');
    const user = userEvent.setup();
    const submit = vi.fn();
    const clear = vi.fn();
    function Search() {
      const [value, setValue] = useState('');
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(value);
          }}
        >
          <SearchInput
            aria-label="Find members"
            name="q"
            onClear={clear}
            onValueChange={setValue}
            value={value}
          />
        </form>
      );
    }
    render(
      <I18nextProvider i18n={i18n}>
        <Search />
      </I18nextProvider>,
    );
    const input = screen.getByRole('searchbox', { name: 'Find members' });
    await user.type(input, 'Mariam');
    expect(input).toHaveValue('Mariam');
    await user.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledWith('Mariam');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(clear).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('preserves combobox semantics, forwarded refs, and disabled state', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(
      <SearchInput
        aria-expanded
        role="combobox"
        disabled
        ref={ref}
        value="City"
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(ref.current).toBe(screen.getByRole('combobox'));
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
