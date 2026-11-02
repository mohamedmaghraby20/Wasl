import { CalendarDays, MapPin, UsersRound, Video } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { Badge } from '@/components/ui/Badge';
import {
  localizedName,
  defaultResourceCover,
  localizedResourceTitle,
  turkeyDateParts,
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
  const date = event ? turkeyDateParts(event.startsAt, i18n.language) : undefined;
  const [firstCategory, ...otherCategories] = item.categories;
  const cover = defaultResourceCover(item.id, kind);
  const [failedCover, setFailedCover] = useState<string>();
  const CoverIcon = event ? CalendarDays : UsersRound;
  const remaining =
    event?.capacity == null ? null : Math.max(0, event.capacity - event.acceptedRegistrationCount);

  return (
    <article className="group relative flex min-w-0 flex-col gap-4 rounded-(--shape-radius-card) border border-border bg-card p-5 shadow-xs transition-[box-shadow,translate,border-color] duration-(--motion-duration-base) ease-(--motion-ease-standard) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background">
      <div
        aria-hidden="true"
        className="-mx-5 -mt-5 grid aspect-video place-items-center overflow-hidden rounded-t-(--shape-radius-card) bg-primary-soft text-primary-soft-text"
      >
        {failedCover === cover ? (
          <CoverIcon className="size-10" strokeWidth={1.75} />
        ) : (
          <img
            alt=""
            className="aspect-video h-full w-full object-cover"
            decoding="async"
            height={675}
            loading="lazy"
            onError={() => setFailedCover(cover)}
            src={cover}
            width={1200}
          />
        )}
      </div>
      {(event && date) || firstCategory ? (
        <div className="flex items-start justify-between gap-3">
          {event && date ? (
            <div className="flex items-center gap-2.5">
              <div className="grid w-11 shrink-0 place-items-center rounded-lg bg-primary-soft py-1.5 text-primary-soft-text">
                <span className="text-[0.625rem] font-bold uppercase leading-none tracking-wide">
                  {date.month}
                </span>
                <span className="mt-0.5 text-lg font-bold leading-none">{date.day}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                  {date.weekday}
                </p>
                <p className="text-sm font-medium text-text">{date.time}</p>
              </div>
            </div>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap justify-end gap-1.5">
            {firstCategory ? (
              <Badge variant="outline">{localizedName(firstCategory, i18n.language)}</Badge>
            ) : null}
            {otherCategories.length > 0 ? (
              <Badge
                title={otherCategories
                  .map((category) => localizedName(category, i18n.language))
                  .join(', ')}
                variant="neutral"
              >
                +{otherCategories.length}
              </Badge>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <h3 className="text-lg font-semibold leading-snug tracking-tight">
          <Link
            className="rounded-sm transition-colors group-hover:text-primary-soft-text focus-visible:outline-none after:absolute after:inset-0 after:rounded-(--shape-radius-card) after:content-['']"
            to={`/${kind}/${item.slug}`}
          >
            {localizedResourceTitle(item)}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">{item.description}</p>
      </div>

      {event ? (
        <div className="mt-auto grid gap-1.5 text-sm">
          <p className="text-text-muted">
            {t('eventRegisteredCount', { count: event.acceptedRegistrationCount })}
          </p>
          {!event.cancelled ? (
            <>
              <p
                className={`font-medium ${remaining === 0 ? 'text-warning' : 'text-primary-soft-text'}`}
              >
                {remaining === null
                  ? t('eventUnlimitedCapacity')
                  : remaining === 0
                    ? t('eventFullWaitlist')
                    : t('eventPlacesLeft', { count: remaining })}
              </p>
              {event.admissionMode === 'approval' ? (
                <p className="text-text-muted">{t('eventApprovalRequired')}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-text-subtle">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <UsersRound aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{item.hostName}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {event?.online ? (
            <Video aria-hidden="true" className="size-3.5 shrink-0" />
          ) : (
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{event?.online ? t('online') : (item.cityName ?? '')}</span>
        </span>
        {event?.cancelled ? (
          <Badge className="ms-auto" variant="danger">
            {t('cancelled')}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}
