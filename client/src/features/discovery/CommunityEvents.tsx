import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useDiscoveryControllerListEvents } from '@/api/generated/discovery/discovery';
import { QueryError } from '@/components/feedback/QueryError';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
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
          <Button
            asChild
            aria-label={t('createEventTitle')}
            title={t('createEventTitle')}
            size="icon-sm"
            variant="outline"
          >
            <Link to={`/create/event?communityId=${encodeURIComponent(communityId)}`}>
              <CalendarPlus aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
      {query.isPending ? (
        <LoadingSkeleton layout="list" message={t('loadingDetails')} rows={4} />
      ) : query.isError ? (
        <QueryError
          message={t('loadError', { resource: t('events') })}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.items.length ? (
        <>
          <div className="grid min-w-0 gap-4">
            {query.data.items.map((event) => (
              <ResourceCard key={event.id} item={event} kind="events" />
            ))}
          </div>
          {page > 1 || query.data.hasMore ? (
            <nav aria-label={t('pagination')} className="flex gap-2">
              <IconButton
                icon={ChevronLeft}
                label={t('previousPage')}
                className="[&_svg]:rtl:rotate-180"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                variant="outline"
              />
              <IconButton
                icon={ChevronRight}
                label={t('nextPage')}
                className="[&_svg]:rtl:rotate-180"
                disabled={!query.data.hasMore}
                onClick={() => setPage(page + 1)}
                variant="outline"
              />
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
