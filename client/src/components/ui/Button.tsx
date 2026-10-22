import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex min-h-(--control-height-md) items-center justify-center gap-2 rounded-(--shape-radius-control) px-(--button-padding-inline-md) text-sm font-semibold transition-[background-color,transform,box-shadow] duration-(--motion-duration-fast) focus-visible:outline-none focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-(--opacity-disabled)',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[var(--color-border)]',
        outline: 'border border-border bg-transparent text-foreground hover:bg-secondary',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ButtonProps): React.JSX.Element {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
}
