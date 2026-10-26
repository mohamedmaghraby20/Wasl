import { ArrowRight, SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResourceCard } from '@/features/resources/ResourceCard';
import { QueryError } from '@/components/feedback/QueryError';
import type { ResourceKind } from '@/features/resources/resource-utils';

export function HomeSection({
  title,
  kind,
  language,
  items,
  isPending,
  isError,
  onRetry,
}: {
  title: string;
  kind: ResourceKind;
  language: string;
  items: (CommunityPublicDto | EventPublicDto)[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const resource = title.toLocaleLowerCase(language);
  return (
    <section className="grid gap-4" aria-labelledby={`${kind}-heading`}>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold sm:text-2xl" id={`${kind}-heading`}>
          {title}
        </h2>
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft-text hover:underline"
          to={`/${kind}`}
        >
          {t('exploreAll')}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      {isPending ? (
        <>
          <p className="sr-only" role="status">
            {t('loading', { resource })}
          </p>
          <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="grid gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5"
                key={index}
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </>
      ) : isError ? (
        <QueryError message={t('loadError', { resource })} onRetry={onRetry} />
      ) : !items?.length ? (
        <EmptyState
          description={t('noHomeResults', { resource })}
          icon={SearchX}
          title={t('noHomeResultsTitle')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ResourceCard key={item.id} item={item} kind={kind} />
          ))}
        </div>
      )}
    </section>
  );
}
