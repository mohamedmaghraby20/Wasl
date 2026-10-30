import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  useDiscoveryControllerCommunity,
  useDiscoveryControllerEvent,
} from '@/api/generated/discovery/discovery';
import { QueryError } from '@/components/feedback/QueryError';
import { languageCode, localizedResourceTitle } from '@/features/resources/resource-utils';
import { usePageMetadata } from '@/features/discovery/usePageMetadata';
import { OrganizerParticipationPanel } from './OrganizerParticipationPanel';

export function ParticipationReviewPage({
  kind,
}: {
  kind: 'communities' | 'events';
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const lang = languageCode(i18n.language);
  const community = useDiscoveryControllerCommunity(
    id,
    { lang },
    { query: { enabled: kind === 'communities' && Boolean(id) } },
  );
  const event = useDiscoveryControllerEvent(
    id,
    { lang },
    { query: { enabled: kind === 'events' && Boolean(id) } },
  );
  const resource = kind === 'communities' ? community : event;
  const title = t(
    params.get('status') === (kind === 'communities' ? 'ACTIVE' : 'ACCEPTED')
      ? kind === 'communities'
        ? 'communityMembers'
        : 'attendees'
      : kind === 'communities'
        ? 'membershipRequests'
        : 'registrationRequests',
  );
  const name = resource.data ? localizedResourceTitle(resource.data) : '';
  usePageMetadata(title, name, { noindex: true });

  return (
    <section className="mx-auto grid w-full max-w-(--container-reading) gap-6">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-text-muted hover:text-text"
        to={`/${kind}/${id}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t(kind === 'communities' ? 'communityDetails' : 'eventDetails')}
      </Link>
      <header className="grid gap-2">
        <h1 className="font-heading text-3xl font-extrabold">{title}</h1>
        {name ? <p className="text-text-muted">{name}</p> : null}
      </header>
      {resource.isPending ? (
        <p role="status">{t('loadingDetails')}</p>
      ) : resource.isError ? (
        <QueryError
          message={t('loadError', { resource: t(kind) })}
          onRetry={() => void resource.refetch()}
        />
      ) : (
        <OrganizerParticipationPanel
          kind={kind}
          resourceId={resource.data.id}
          mode="directory"
          eventStarted={Boolean(
            event.data && new Date(event.data.startsAt).getTime() <= Date.now(),
          )}
        />
      )}
    </section>
  );
}
