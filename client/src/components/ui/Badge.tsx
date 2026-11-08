import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex min-h-(--badge-min-height) max-w-full items-center gap-2 rounded-full border px-(--badge-padding-inline) text-xs font-bold leading-5 [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'border-transparent bg-surface-soft text-text-muted',
        primary: 'border-transparent bg-primary-soft text-primary-soft-text',
        outline: 'border-border-strong bg-transparent text-text-muted',
        success: 'border-transparent bg-success-soft text-success',
        warning: 'border-transparent bg-warning-soft text-warning',
        danger: 'border-transparent bg-danger-soft text-danger',
        info: 'border-transparent bg-info-soft text-info',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>): React.JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
