import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>): React.JSX.Element {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium leading-none text-text', className)}
      {...props}
    />
  );
}
