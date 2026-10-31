import { render, screen } from '@testing-library/react';
import { Check, Trash2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button icons', () => {
  it('owns compact icon sizing and preserves touch targets and accessible names', () => {
    render(<Button aria-label="Approve" size="icon-sm" variant="outline" intent="success"><Check aria-hidden="true" /></Button>);
    const button = screen.getByRole('button', { name: 'Approve' });
    expect(button).toHaveClass('size-9', 'pointer-coarse:size-11', '[&_svg]:size-4');
    expect(button).toHaveClass('hover:text-success', 'focus-visible:text-success');
    expect(button).not.toHaveAttribute('intent');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps destructive hover and focus feedback on slotted links', () => {
    render(<Button asChild intent="danger" variant="ghost"><a href="/remove"><Trash2 aria-hidden="true" />Remove</a></Button>);
    expect(screen.getByRole('link', { name: 'Remove' })).toHaveClass('hover:bg-danger-soft', 'hover:text-danger', 'focus-visible:text-danger');
  });

  it('preserves disabled state on compact actions', () => {
    render(<Button aria-label="Reject" disabled intent="danger" size="icon-sm" variant="outline"><Trash2 aria-hidden="true" /></Button>);
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveClass('disabled:pointer-events-none');
  });
});
