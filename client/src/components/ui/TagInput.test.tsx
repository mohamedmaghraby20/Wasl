import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { Field } from './Field';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  it('supports keyboard tag entry and removal without axe violations', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<main><I18nextProvider i18n={i18n}><Field id="interests" label="Interests"><TagInput id="interests" value={['music']} onChange={onChange} /></Field></I18nextProvider></main>);
    await user.type(screen.getByRole('textbox'), 'art{Enter}');
    expect(onChange).toHaveBeenCalledWith(['music', 'art']);
    expect((await axe(document.body)).violations).toHaveLength(0);
  });
});
