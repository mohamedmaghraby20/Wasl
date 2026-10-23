import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-(--shape-radius-card) border border-border bg-card text-card-foreground shadow-xs',
        className,
      )}
      {...props}
    />
  );
}
