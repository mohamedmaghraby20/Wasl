import { CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import {
  formatTurkeyDateTime,
  localizedName,
  localizedResourceTitle,
  type ResourceKind,
} from './resource-utils';

export function ResourceCard({
  item,
  kind,
}: {
  item: CommunityPublicDto | EventPublicDto;
  kind: ResourceKind;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const event = kind === 'events' && 'startsAt' in item ? item : undefined;

  return (
    <article
      className={`grid content-start gap-3 rounded-(--shape-radius-card) border border-border bg-card p-5 ${event ? 'border-s-4 border-s-primary' : ''}`}
    >
      {event && (
        <div className="flex items-center gap-2 rounded-(--shape-radius-control) bg-primary-soft px-3 py-2 text-sm font-semibold text-[var(--color-primary-soft-text)]">
          <CalendarDays aria-hidden="true" size={16} />
          {formatTurkeyDateTime(event.startsAt, i18n.language)}
        </div>
      )}
      <ul className="flex flex-wrap gap-2" aria-label={t('allCategories')}>
        {item.categories.map((category) => (
          <li key={category.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
            {localizedName(category, i18n.language)}
          </li>
        ))}
      </ul>
      <h3 className="text-xl font-bold">
        <Link
          className="rounded-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          to={`/${kind}/${item.slug}`}
        >
          {localizedResourceTitle(item)}
        </Link>
      </h3>
      <p className="line-clamp-3 text-sm text-[color:var(--color-text-muted)]">
        {item.description}
      </p>
      <p className="text-sm">{item.hostName}</p>
      <div className="flex flex-wrap gap-4 text-sm text-[color:var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <MapPin aria-hidden="true" size={16} />
          {event?.online ? t('online') : item.cityName}
        </span>
      </div>
      {event?.cancelled && <p className="font-semibold text-destructive">{t('cancelled')}</p>}
    </article>
  );
}
