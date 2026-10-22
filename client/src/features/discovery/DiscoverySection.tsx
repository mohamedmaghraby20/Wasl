import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { DiscoveryPagination } from './DiscoveryPagination';
import { ResourceCard } from '@/features/resources/ResourceCard';
import type { ResourceKind } from '@/features/resources/resource-utils';
import { QueryError } from '@/components/feedback/QueryError';

export function DiscoverySection({
  kind,
  title,
  results,
  page,
  loading,
  error,
  onRetry,
  pageSize,
  showExploreAll,
  exploreHref,
  onPageChange,
}: {
  kind: ResourceKind;
  title: string;
  results: (CommunityPublicDto | EventPublicDto)[] | undefined;
  page: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  pageSize: number;
  showExploreAll: boolean;
  exploreHref: string;
  onPageChange: (page: number) => void;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const headingId = `${kind}-heading`;
  return (
    <section className="grid gap-4" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-2xl font-bold">
          {title}
        </h2>
        {showExploreAll && (
          <Link
            className="text-sm font-semibold text-[var(--color-primary-soft-text)] hover:underline"
            to={exploreHref}
          >
            {t('exploreAll')}
          </Link>
        )}
      </div>
      {loading ? (
        <p role="status">{t('loading', { resource: title.toLocaleLowerCase(i18n.language) })}</p>
      ) : error ? (
        <QueryError
          message={t('loadError', { resource: title.toLocaleLowerCase(i18n.language) })}
          onRetry={onRetry}
        />
      ) : !results?.length ? (
        <p className="rounded-lg border border-border bg-card p-5">
          {t('noResults', { resource: title.toLocaleLowerCase(i18n.language) })}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.slice(0, pageSize).map((item) => (
            <ResourceCard key={item.id} item={item} kind={kind} />
          ))}
        </div>
      )}
      {!showExploreAll && !loading && !error && results && results.length > 0 && (
        <DiscoveryPagination
          page={page}
          canGoForward={results.length > pageSize}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
}
