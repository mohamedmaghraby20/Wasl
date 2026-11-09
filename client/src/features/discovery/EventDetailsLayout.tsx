import type { ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  Ticket,
  UsersRound,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { Badge } from '@/components/ui/Badge';
import {
  formatTurkeyDateTime,
  googleMapsUrl,
  localizedName,
  localizedResourceTitle,
} from '@/features/resources/resource-utils';
import { ResourceShareLinks } from '@/features/resources/ResourceShareLinks';
import { AddToCalendar } from './AddToCalendar';

/**
 * Event page shell: full-width header and a two-column body where the facts and
 * registration panel come before the description on small screens.
 */
export function EventDetailsLayout({
  item,
  hostPath,
  admissionLabel,
  headerActions,
  registration,
  onCopyShare,
  children,
}: {
  item: EventPublicDto;
  hostPath?: string | undefined;
  admissionLabel: string;
  headerActions: ReactNode;
  registration: ReactNode;
  onCopyShare: () => void;
  children: ReactNode;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const mapsQuery = item.online
    ? null
    : item.locationName
      ? `${item.locationName}, ${item.cityName ?? ''}`.replace(/, $/, '')
      : item.cityName;
  const mapsHref = googleMapsUrl(mapsQuery);

  return (
    <article className="mx-auto grid w-full min-w-0 max-w-(--container-max) gap-8 sm:gap-10">
      <div className="grid justify-items-start gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
          to="/events"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t('backTo', { resource: t('events') })}
        </Link>
        <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
      </div>

      <header className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-3">
          {item.categories.length ? (
            <ul aria-label={t('categoriesLabel')} className="flex flex-wrap gap-1.5">
              {item.categories.map((category) => (
                <li key={category.id}>
                  <Badge variant="primary">{localizedName(category, i18n.language)}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <h1 className="text-3xl font-extrabold sm:text-4xl">{localizedResourceTitle(item)}</h1>
          <p className="text-sm text-text-muted">
            <span>{t('hostedByLabel')} </span>
            {hostPath ? (
              <Link
                className="font-semibold text-primary-soft-text underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
                to={hostPath}
              >
                {item.hostName}
              </Link>
            ) : (
              <span className="font-medium text-text">{item.hostName}</span>
            )}
          </p>
        </div>
        {item.cancelled ? (
          <p
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            role="status"
          >
            {t('cancelledMessage')}
          </p>
        ) : null}
      </header>

      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <aside
          aria-label={t('eventSidebar')}
          className="grid min-w-0 gap-4 lg:sticky lg:top-24 lg:order-last"
        >
          <section className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3 rounded-xl bg-primary-soft px-4 py-3 text-primary-soft-text">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div className="grid gap-0.5 text-sm">
                <p className="font-semibold">
                  {formatTurkeyDateTime(item.startsAt, i18n.language, 'full')}
                </p>
                {item.endsAt ? (
                  <p className="text-xs opacity-80">
                    {t('endsAt', { date: formatTurkeyDateTime(item.endsAt, i18n.language, 'full') })}
                  </p>
                ) : null}
              </div>
            </div>
            {item.acceptedRegistrationCount > 0 ? (
              <p className="text-sm text-text-muted">
                {t('eventRegisteredCount', { count: item.acceptedRegistrationCount })}
              </p>
            ) : null}
            <dl className="grid gap-4">
              <div className="grid gap-1">
                <dt className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-subtle">
                  {item.online ? (
                    <Video aria-hidden="true" className="size-3.5 shrink-0" />
                  ) : (
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                  )}
                  {t('detailLocation')}
                </dt>
                <dd className="text-sm font-medium text-text">
                  {mapsHref ? (
                    <a
                      className="group inline-grid justify-items-start gap-1"
                      href={mapsHref}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="transition-colors group-hover:text-primary-soft-text">
                        {mapsQuery}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-soft-text underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary">
                        <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                        {t('viewOnGoogleMaps')}
                      </span>
                    </a>
                  ) : (
                    <span>{item.online ? t('online') : mapsQuery || item.cityName}</span>
                  )}
                </dd>
              </div>
              {!item.cancelled ? (
                <div className="grid gap-1">
                  <dt className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-subtle">
                    <Ticket aria-hidden="true" className="size-3.5 shrink-0" />
                    {t('detailAdmission')}
                  </dt>
                  <dd className="text-sm font-medium text-text">{t(admissionLabel)}</dd>
                </div>
              ) : null}
              {item.capacity !== undefined && item.capacity !== null ? (
                <div className="grid gap-1">
                  <dt className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-subtle">
                    <UsersRound aria-hidden="true" className="size-3.5 shrink-0" />
                    {t('capacityLabel')}
                  </dt>
                  <dd className="text-sm font-medium text-text">
                    {t('capacityValue', { capacity: item.capacity })}
                  </dd>
                </div>
              ) : null}
            </dl>
            <AddToCalendar event={item} />
            {registration}
          </section>
          <ResourceShareLinks
            label={t('shareEvent')}
            onCopy={onCopyShare}
            path={`/events/${item.slug}`}
            title={item.title}
          />
        </aside>
        <div className="grid min-w-0 content-start gap-7">{children}</div>
      </div>
    </article>
  );
}
