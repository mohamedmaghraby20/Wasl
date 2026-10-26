import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { fieldControlClasses } from './Input';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>): React.JSX.Element {
  return (
    <textarea
      className={cn(
        fieldControlClasses,
        'min-h-32 max-h-96 resize-y px-3 py-2.5 leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}
