import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-soft', className)}
    />
  );
}
