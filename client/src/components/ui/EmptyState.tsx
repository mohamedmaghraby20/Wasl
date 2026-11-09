import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  role,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid justify-items-center gap-3 rounded-(--shape-radius-card) border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center',
        className,
      )}
      role={role}
    >
      {Icon ? (
        <span className="grid size-11 place-items-center rounded-(--shape-radius-control) bg-surface-soft text-text-subtle">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      ) : null}
      <p className="text-base font-semibold text-text">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
