import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { DeleteDialog } from './DeleteDialog';

describe('DeleteDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  function show(onDelete: () => Promise<void | string>, onClose = vi.fn(), onComplete = vi.fn()) {
    render(
      <I18nextProvider i18n={i18n}>
        <DeleteDialog
          open
          onClose={onClose}
          onComplete={onComplete}
          title="Delete community"
          description="All events and membership history will be permanently removed."
          confirmationText="Language Circle"
          confirmLabel="Delete community"
          successMessage="Community deleted."
          errorMessage="Deletion failed. Try again."
          onDelete={onDelete}
        />
      </I18nextProvider>,
    );
  }
  it('requires the exact name and keeps the dialog open during deletion and completion', async () => {
    const user = userEvent.setup();
    let finish!: (value: string) => void;
    const remove = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const close = vi.fn();
    const complete = vi.fn();
    show(remove, close, complete);
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'Delete community' });
    expect(button).toBeDisabled();
    await user.type(input, 'language circle');
    expect(button).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'Language Circle');
    await user.dblClick(button);
    expect(remove).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(close).not.toHaveBeenCalled();
    finish('Community deleted. Chat cleanup pending.');
    expect(await screen.findByText('Community deleted. Chat cleanup pending.')).toBeVisible();
    expect(complete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(close).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
  });
  it('shows failures without reporting success and allows retry', async () => {
    const user = userEvent.setup();
    const remove = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce();
    show(remove);
    await user.type(screen.getByRole('textbox'), 'Language Circle');
    await user.click(screen.getByRole('button', { name: 'Delete community' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Deletion failed. Try again.');
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete community' })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: 'Delete community' }));
    expect(await screen.findByText('Community deleted.')).toBeVisible();
    expect(remove).toHaveBeenCalledTimes(2);
  });
  it('cancels without calling deletion', async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    const close = vi.fn();
    show(remove, close);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });
});
