import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
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
  return (
    <section className="grid gap-4" aria-labelledby={`${kind}-heading`}>
      <div className="flex items-center justify-between">
        <h2 id={`${kind}-heading`} className="text-2xl font-bold">
          {title}
        </h2>
        <Link
          className="text-sm font-semibold text-[var(--color-primary-soft-text)] hover:underline"
          to={`/${kind}`}
        >
          {t('exploreAll')}
        </Link>
      </div>
      {isPending ? (
        <p role="status">{t('loading', { resource: title.toLocaleLowerCase(language) })}</p>
      ) : isError ? (
        <QueryError
          message={t('loadError', { resource: title.toLocaleLowerCase(language) })}
          onRetry={onRetry}
        />
      ) : !items?.length ? (
        <p className="rounded-lg border border-border bg-card p-4">
          {t('noResults', { resource: title.toLocaleLowerCase(language) })}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <ResourceCard key={item.id} item={item} kind={kind} />
          ))}
        </div>
      )}
    </section>
  );
}
