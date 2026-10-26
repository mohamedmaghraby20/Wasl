import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const fieldControlClasses =
  'w-full min-w-0 rounded-(--shape-radius-control) border border-input bg-background text-sm text-text shadow-xs transition-[border-color,box-shadow] duration-(--motion-duration-fast) placeholder:text-text-subtle hover:border-border-control-hover disabled:cursor-not-allowed disabled:bg-surface-soft disabled:opacity-(--opacity-disabled) aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>): React.JSX.Element {
  return (
    <input
      className={cn(fieldControlClasses, 'h-11 px-3 py-2', className)}
      type={type}
      {...props}
    />
  );
}
