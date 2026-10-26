import { ArrowRight, SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DiscoveryPagination } from './DiscoveryPagination';
import { ResourceCard } from '@/features/resources/ResourceCard';
import type { ResourceKind } from '@/features/resources/resource-utils';
import { QueryError } from '@/components/feedback/QueryError';

export function DiscoverySection({
  kind,
  title,
  total,
  results,
  page,
  loading,
  error,
  onRetry,
  hasMore,
  showExploreAll,
  exploreHref,
  onPageChange,
}: {
  kind: ResourceKind;
  title: string;
  total?: number | undefined;
  results: (CommunityPublicDto | EventPublicDto)[] | undefined;
  page: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  hasMore: boolean;
  showExploreAll: boolean;
  exploreHref: string;
  onPageChange: (page: number) => void;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const headingId = `${kind}-heading`;
  const resource = t(kind).toLocaleLowerCase(i18n.language);
  const resultTotal = total ?? 0;
  const showCount = !loading && !error && resultTotal > 0;
  return (
    <section className="grid gap-4" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-xl font-bold sm:text-2xl" id={headingId}>
            {title}
          </h2>
          {showCount ? (
            <p aria-live="polite" className="text-sm text-text-muted">
              {t('resultCount', { count: resultTotal })}
            </p>
          ) : null}
        </div>
        {showExploreAll && (
          <Link
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft-text hover:underline"
            to={exploreHref}
          >
            {t('exploreAll')}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        )}
      </div>

      {loading ? (
        <>
          <p className="sr-only" role="status">
            {t('loading', { resource })}
          </p>
          <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5"
                key={index}
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="size-11 rounded-lg" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-4 h-8 w-full" />
              </div>
            ))}
          </div>
        </>
      ) : error ? (
        <QueryError message={t('loadError', { resource })} onRetry={onRetry} />
      ) : !results?.length ? (
        <EmptyState
          description={t('noResults', { resource })}
          icon={SearchX}
          title={t('noResultsTitle')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => (
            <ResourceCard key={item.id} item={item} kind={kind} />
          ))}
        </div>
      )}

      {!showExploreAll && !loading && !error && results && results.length > 0 && (
        <DiscoveryPagination page={page} canGoForward={hasMore} onPageChange={onPageChange} />
      )}
    </section>
  );
}
