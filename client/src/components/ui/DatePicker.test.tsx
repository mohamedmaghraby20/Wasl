import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('opens by keyboard and exposes an accessible calendar', async () => {
    const user = userEvent.setup();
    render(<main><I18nextProvider i18n={i18n}><DatePicker label="Start date" value="" onChange={vi.fn()} /></I18nextProvider></main>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Start date' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('grid')).toBeVisible();
    expect((await axe(document.body)).violations).toHaveLength(0);
  });
});
