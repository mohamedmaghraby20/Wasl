import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';

type Layout = 'list' | 'grid' | 'profile' | 'form' | 'article';

export function LoadingSkeleton({
  message,
  layout = 'list',
  rows = 3,
  className,
}: {
  message: string;
  layout?: Layout;
  rows?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn('grid gap-4', className)}
      role="status"
    >
      <span className="sr-only">{message}</span>
      <div aria-hidden="true">
        {layout === 'list' ? (
          <div className="grid gap-3">
            {Array.from({ length: rows }, (_, index) => (
              <div
                className="flex items-center gap-3 rounded-(--shape-radius-card) border border-border bg-card p-4"
                key={index}
              >
                <Skeleton className="size-11 shrink-0 rounded-(--shape-radius-control)" />
                <div className="grid min-w-0 flex-1 gap-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                <Skeleton className="size-9 shrink-0 rounded-(--shape-radius-control)" />
              </div>
            ))}
          </div>
        ) : layout === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: rows }, (_, index) => (
              <div
                className="grid min-h-40 content-start justify-items-center gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5"
                key={index}
              >
                <Skeleton className="size-14 rounded-(--shape-radius-control)" />
                <div className="grid w-full justify-items-center gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : layout === 'profile' ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6">
              <Skeleton className="size-20 shrink-0 rounded-(--shape-radius-control)" />
              <div className="grid min-w-0 flex-1 gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <div className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-6">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="mt-2 h-5 w-1/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : layout === 'form' ? (
          <div className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-5 sm:p-7">
            <Skeleton className="h-7 w-2/5" />
            <Skeleton className="h-4 w-3/4" />
            {Array.from({ length: rows }, (_, index) => (
              <div className="grid gap-2" key={index}>
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-11 w-full rounded-(--shape-radius-control)" />
              </div>
            ))}
          </div>
        ) : (
          <article className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5">
            <Skeleton className="h-7 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-2 grid gap-3 border-t border-border pt-4">
              <Skeleton className="h-5 w-1/3" />
              {Array.from({ length: rows }, (_, index) => (
                <Skeleton className="h-4 w-full" key={index} />
              ))}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
