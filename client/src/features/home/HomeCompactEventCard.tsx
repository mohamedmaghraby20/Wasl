import { Clock3, Video } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { formatTurkeyDateTime } from '@/features/resources/resource-utils';

/** Image-led event preview for the homepage carousel. */
export function HomeCompactEventCard({
  item,
  language,
}: {
  item: EventPublicDto;
  language: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <article className="min-w-0">
      <Link
        className="group grid gap-2 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
        to={`/events/${item.slug}`}
      >
        <div className="relative aspect-video overflow-hidden border border-border bg-primary-soft">
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            loading="lazy"
            src="/images/community-covers/events-abstract.svg"
          />
          <span className="absolute end-2 top-2 inline-flex items-center gap-1 border border-border bg-card px-1.5 py-0.5 text-xs font-medium">
            <Video aria-hidden="true" className="size-3" />
            {t('online')}
          </span>
        </div>
        <div className="grid min-w-0 gap-1">
          <h3 className="line-clamp-2 wrap-anywhere text-sm font-semibold leading-snug group-hover:underline">
            {item.title}
          </h3>
          <time
            className="flex items-start gap-1.5 text-xs text-text-muted"
            dateTime={item.startsAt}
          >
            <Clock3 aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            {formatTurkeyDateTime(item.startsAt, language)}
          </time>
        </div>
      </Link>
    </article>
  );
}
