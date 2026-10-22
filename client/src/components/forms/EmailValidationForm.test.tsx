import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { EmailValidationForm } from '@/components/forms/EmailValidationForm';
import { i18n } from '@/lib/i18n';

describe('EmailValidationForm', () => {
  it('announces an invalid email submission', async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <EmailValidationForm />
      </I18nextProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Validate email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
  });
});
