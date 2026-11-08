import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>): React.JSX.Element {
  return (
    <LabelPrimitive.Root
      className={cn('text-xs font-bold leading-normal text-text', className)}
      {...props}
    />
  );
}
