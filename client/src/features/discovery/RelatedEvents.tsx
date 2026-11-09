import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { useDiscoveryControllerListEvents } from '@/api/generated/discovery/discovery';
import { Button } from '@/components/ui/Button';
import { ResourceCard } from '@/features/resources/ResourceCard';
import { languageCode } from '@/features/resources/resource-utils';

/** Upcoming public events from the community hosting this event. */
export function RelatedEvents({ event }: { event: EventPublicDto }): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const isCommunityHost = event.hostType === 'community';
  const query = useDiscoveryControllerListEvents(
    {
      communityId: event.hostId,
      upcoming: true,
      nonCancelled: true,
      lang: languageCode(i18n.language),
      pageSize: 4,
    },
    { query: { enabled: isCommunityHost } },
  );
  const items = query.data?.items.filter((item) => item.id !== event.id).slice(0, 3) ?? [];
  if (!isCommunityHost || !items.length) return null;

  return (
    <section
      aria-labelledby="related-events-heading"
      className="grid gap-5 border-t border-border pt-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold" id="related-events-heading">
          {t('relatedEvents')}
        </h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/communities/${event.hostId}`}>{t('seeAll')}</Link>
        </Button>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <ResourceCard item={item} key={item.id} kind="events" />
        ))}
      </div>
    </section>
  );
}
