import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'button-offset-hover inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,translate] duration-(--motion-duration-base) ease-(--motion-ease-standard) disabled:pointer-events-none disabled:opacity-(--opacity-disabled) [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'rounded-(--shape-radius-control) bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
        secondary:
          'rounded-(--shape-radius-control) border border-border-control bg-secondary text-secondary-foreground transition-none hover:bg-secondary-foreground hover:text-secondary active:bg-primary-active active:text-primary-foreground',
        outline:
          'rounded-(--shape-radius-control) border border-border-strong bg-surface text-text hover:border-primary-soft-text hover:bg-primary-soft hover:text-primary-soft-text focus-visible:bg-primary-soft focus-visible:text-primary-soft-text active:bg-primary-soft',
        ghost:
          'rounded-(--shape-radius-control) text-text-muted hover:bg-surface-soft hover:text-text focus-visible:bg-surface-soft focus-visible:text-text',
        danger:
          'rounded-(--shape-radius-control) bg-destructive text-destructive-foreground hover:bg-danger-hover active:bg-danger-hover',
        'danger-ghost':
          'rounded-(--shape-radius-control) text-danger hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft focus-visible:text-danger',
        link: 'rounded-(--shape-radius-sm) text-primary-soft-text underline decoration-primary/50 decoration-2 underline-offset-4 hover:decoration-primary',
      },
      size: {
        sm: 'h-11 px-3 text-[0.8125rem]',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-[0.9375rem]',
        icon: 'size-11 p-0 [&_svg]:size-4.5',
        'icon-sm': 'size-9 p-0 pointer-coarse:size-11 [&_svg]:size-4',
      },
      intent: {
        success:
          'hover:border-success/40 hover:bg-success-soft hover:text-success focus-visible:border-success/40 focus-visible:bg-success-soft focus-visible:text-success',
        danger:
          'hover:border-danger/40 hover:bg-danger-soft hover:text-danger focus-visible:border-danger/40 focus-visible:bg-danger-soft focus-visible:text-danger',
        warning:
          'hover:border-warning/40 hover:bg-warning-soft hover:text-warning focus-visible:border-warning/40 focus-visible:bg-warning-soft focus-visible:text-warning',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  block,
  intent,
  asChild = false,
  ...props
}: ButtonProps): React.JSX.Element {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, size, block, intent }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
