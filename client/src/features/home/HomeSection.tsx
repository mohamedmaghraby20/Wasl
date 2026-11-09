import { ArrowRight, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { CommunityPublicDto, EventPublicDto } from '@/api/generated/wasl-client.schemas';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconButton } from '@/components/ui/IconButton';
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
  viewAll,
  sectionId = kind,
}: {
  title: string;
  kind: ResourceKind;
  language: string;
  items: (CommunityPublicDto | EventPublicDto)[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  viewAll?: string;
  sectionId?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const resource = title.toLocaleLowerCase(language);
  const isEventList = kind === 'events';
  const row = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ overflow: false, start: true, end: false });
  const rtl = language.startsWith('ar');
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const measure = (): void => {
      const offset = Math.abs(element.scrollLeft);
      const maximum = element.scrollWidth - element.clientWidth;
      setPosition({ overflow: maximum > 1, start: offset < 1, end: offset >= maximum - 1 });
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    element.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      element.removeEventListener('scroll', measure);
    };
  }, [items, isPending, isError, language]);
  const move = (forward: boolean): void => {
    const element = row.current;
    if (!element) return;
    element.scrollBy({ left: element.clientWidth * (forward ? 1 : -1) * (rtl ? -1 : 1) });
  };
  const rowClass = isEventList
    ? 'grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3'
    : 'grid min-w-0 grid-flow-col auto-cols-[85%] gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-1 -m-1 sm:auto-cols-[calc((100%-1rem)/2)] xl:auto-cols-[calc((100%-2rem)/3)]';
  return (
    <section className="grid gap-4" aria-labelledby={`${sectionId}-heading`}>
      <div className="grid gap-1 sm:flex sm:items-end sm:justify-between sm:gap-3">
        <h2 className="text-xl font-bold sm:text-2xl" id={`${sectionId}-heading`}>
          {title}
        </h2>
        <div className="flex items-center justify-end gap-2">
          {!isEventList && position.overflow && !isPending && !isError && items?.length ? (
            <div className="flex gap-2">
              <IconButton
                aria-controls={`${sectionId}-cards`}
                disabled={position.start}
                icon={rtl ? ChevronRight : ChevronLeft}
                label={t('homePreviousCards')}
                onClick={() => move(false)}
                variant="secondary"
              />
              <IconButton
                aria-controls={`${sectionId}-cards`}
                disabled={position.end}
                icon={rtl ? ChevronLeft : ChevronRight}
                label={t('homeNextCards')}
                onClick={() => move(true)}
                variant="secondary"
              />
            </div>
          ) : null}
          <Link
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-sm font-semibold text-primary-soft-text hover:underline sm:me-28"
            to={viewAll ?? `/${kind}`}
          >
            {t('exploreAll')}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
      {isPending ? (
        <>
          <p className="sr-only" role="status">
            {t('loading', { resource })}
          </p>
          <div aria-hidden="true" className={rowClass}>
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className={`flex flex-col gap-2 rounded-(--shape-radius-card) border border-border bg-card p-4 ${kind === 'events' ? '' : 'min-h-[18rem]'}`}
                key={index}
              >
                <Skeleton
                  className={`-mx-4 -mt-4 rounded-b-none rounded-t-(--shape-radius-card) ${isEventList ? 'h-(--event-cover-height)' : 'aspect-video'}`}
                />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="mt-auto grid gap-2 border-t border-border pt-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
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
        <div
          aria-label={isEventList ? undefined : t('homeBrowseCards', { resource: title })}
          className={`${rowClass} rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2`}
          id={`${sectionId}-cards`}
          ref={isEventList ? undefined : row}
          role={isEventList ? undefined : 'group'}
          tabIndex={isEventList ? undefined : 0}
          onKeyDown={(event) => {
            if (isEventList || event.target !== event.currentTarget) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === (rtl ? 'ArrowLeft' : 'ArrowRight'));
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              event.currentTarget.scrollTo({
                left: event.key === 'Home' ? 0 : event.currentTarget.scrollWidth * (rtl ? -1 : 1),
              });
            }
          }}
        >
          {items.slice(0, 4).map((item) => (
            <div
              className={
                isEventList ? 'min-w-0 self-start' : 'min-h-[18rem] min-w-0 [&>article]:h-full'
              }
              key={item.id}
            >
              <ResourceCard item={item} kind={kind} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
