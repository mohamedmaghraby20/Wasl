import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Label } from './Label';

/**
 * A form row: label, control, optional hint, optional error. Keeps every form
 * in the app on the same vertical rhythm instead of ad-hoc label wrappers.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}): React.JSX.Element {
  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-baseline gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        {required ? (
          <span aria-hidden="true" className="text-sm font-medium text-danger">
            *
          </span>
        ) : null}
      </div>
      {children}
      {hint && !error ? (
        <p className="text-xs leading-relaxed text-text-subtle" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger" id={`${id}-error`}>
          <CircleAlert aria-hidden="true" className="size-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
