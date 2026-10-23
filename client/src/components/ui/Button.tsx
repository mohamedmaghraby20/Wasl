import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,translate] duration-(--motion-duration-base) ease-(--motion-ease-standard) disabled:pointer-events-none disabled:opacity-(--opacity-disabled) [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'rounded-(--shape-radius-control) bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover hover:shadow-sm active:bg-primary-active',
        secondary:
          'rounded-(--shape-radius-control) border border-primary/25 bg-primary-soft text-primary-soft-text hover:border-primary/45 hover:bg-primary-soft/70 active:bg-primary-soft/60',
        outline:
          'rounded-(--shape-radius-control) border border-border bg-surface text-text hover:border-border-strong hover:bg-surface-soft active:bg-surface-soft/70',
        ghost:
          'rounded-(--shape-radius-control) text-text-muted hover:bg-surface-soft hover:text-text',
        danger:
          'rounded-(--shape-radius-control) bg-danger text-white shadow-xs hover:bg-danger-hover active:bg-danger-hover',
        'danger-ghost':
          'rounded-(--shape-radius-control) text-danger hover:bg-danger-soft hover:text-danger',
        link: 'rounded-(--shape-radius-sm) text-primary-soft-text underline decoration-primary/50 decoration-2 underline-offset-4 hover:decoration-primary',
      },
      size: {
        sm: 'h-9 px-3 text-[0.8125rem]',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-[0.9375rem]',
        icon: 'size-11 p-0',
        'icon-sm': 'size-9 p-0',
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
  asChild = false,
  ...props
}: ButtonProps): React.JSX.Element {
  const Component = asChild ? Slot : 'button';
  return (
    <Component className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  );
}

export { buttonVariants };
