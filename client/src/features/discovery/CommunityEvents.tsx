import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useDiscoveryControllerListEvents } from '@/api/generated/discovery/discovery';
import { QueryError } from '@/components/feedback/QueryError';
import { Button } from '@/components/ui/Button';
import { ResourceCard } from '@/features/resources/ResourceCard';
import { languageCode } from '@/features/resources/resource-utils';

export function CommunityEvents({
  communityId,
  canManage,
}: {
  communityId: string;
  canManage: boolean;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useDiscoveryControllerListEvents({
    communityId,
    page,
    pageSize: 6,
    lang: languageCode(i18n.language),
  });
  return (
    <section aria-labelledby="community-events-heading" className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold" id="community-events-heading">
          {t('events')}
        </h2>
        {canManage ? (
          <Button asChild size="sm" variant="outline">
            <Link to={`/create/event?communityId=${encodeURIComponent(communityId)}`}>
              {t('createEventTitle')}
            </Link>
          </Button>
        ) : null}
      </div>
      {query.isPending ? (
        <p role="status">{t('loadingDetails')}</p>
      ) : query.isError ? (
        <QueryError
          message={t('loadError', { resource: t('events') })}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {query.data.items.map((event) => (
              <ResourceCard key={event.id} item={event} kind="events" />
            ))}
          </div>
          {page > 1 || query.data.hasMore ? (
            <nav aria-label={t('pagination')} className="flex gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                size="sm"
                variant="outline"
              >
                {t('previousPage')}
              </Button>
              <Button
                disabled={!query.data.hasMore}
                onClick={() => setPage(page + 1)}
                size="sm"
                variant="outline"
              >
                {t('nextPage')}
              </Button>
            </nav>
          ) : null}
        </>
      ) : (
        <p className="rounded-(--shape-radius-card) border border-dashed border-border p-6 text-sm text-text-muted">
          {t('noCommunityEvents')}
        </p>
      )}
    </section>
  );
}
