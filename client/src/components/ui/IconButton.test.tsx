import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMinus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('shows only a glyph while preserving the action name, tooltip, sizing and handler', async () => {
    const onClick = vi.fn();
    render(<IconButton icon={UserMinus} label="Remove" intent="danger" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Remove' });
    expect(button.textContent).toBe('');
    expect(button).toHaveAttribute('title', 'Remove');
    expect(button).toHaveClass('size-9', 'pointer-coarse:size-11', 'hover:text-danger');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('preserves localized labels and disabled pending states', async () => {
    const onClick = vi.fn();
    render(<IconButton icon={UserMinus} label="إزالة" aria-busy disabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'إزالة' });
    expect(button).toHaveAttribute('title', 'إزالة');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
