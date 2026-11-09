import { useHead } from '@unhead/react';
import { ArrowRight, Building2, CalendarPlus, UsersRound } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useCommunitiesControllerMine } from '@/api/generated/communities/communities';
import { useEventsControllerMine } from '@/api/generated/events/events';
import { QueryError } from '@/components/feedback/QueryError';
import { useAuth } from '@/features/auth/AuthProvider';

function ManagedList({
  kind,
  query,
}: {
  kind: 'communities' | 'events';
  query: {
    data: { id: string; name: string }[] | undefined;
    isPending: boolean;
    isError: boolean;
    refetch: () => unknown;
  };
}): React.JSX.Element {
  const { t } = useTranslation();
  const resource = t(kind);
  return (
    <section aria-labelledby={`managed-${kind}`} className="grid content-start gap-2">
      <h3 id={`managed-${kind}`} className="font-semibold">
        {resource}
      </h3>
      {query.isError ? (
        <QueryError message={t('loadError', { resource })} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <p role="status" className="text-sm text-text-muted">
          {t('loading', { resource })}
        </p>
      ) : query.data?.length ? (
        <ul className="divide-y divide-border border border-border bg-card">
          {query.data.map(({ id, name }) => (
            <li key={id}>
              <Link
                className="flex min-h-11 items-center px-3 text-sm font-medium hover:underline"
                to={`/${kind}/${id}`}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">{t('managedResourcesEmpty')}</p>
      )}
    </section>
  );
}

export function CreationStartPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  useHead({ title: t('create') });
  const communities = useCommunitiesControllerMine({ query: { enabled: Boolean(user) } });
  const events = useEventsControllerMine({
    query: {
      enabled: Boolean(user),
      select: (items) => items.map(({ id, title }) => ({ id, name: title })),
    },
  });

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (loading)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('authWorking')}
      </p>
    );

  const options = [
    {
      action: t('createCommunityAction'),
      description: t('createCommunityIntro'),
      icon: UsersRound,
      title: t('createCommunityTitle'),
      to: '/create/community',
    },
    {
      action: t('createEventAction'),
      description: t('createEventIntro'),
      icon: CalendarPlus,
      title: t('createEventTitle'),
      to: '/create/event',
    },
    {
      action: t('createOrganizationAction'),
      description: t('createOrganizationIntro'),
      icon: Building2,
      title: t('createOrganizationTitle'),
      to: '/create/organization',
    },
  ];

  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('createTitle')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('createIntro')}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <Link
            className="group flex flex-col gap-4 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs transition-[box-shadow,translate,border-color] duration-(--motion-duration-base) ease-(--motion-ease-standard) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
            key={option.to}
            to={option.to}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-soft-text">
              <option.icon aria-hidden="true" className="size-5" />
            </span>
            <div className="grid gap-1.5">
              <h2 className="text-lg font-semibold leading-snug">{option.title}</h2>
              <p className="text-sm leading-relaxed text-text-muted">{option.description}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary-soft-text">
              {option.action}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              />
            </span>
          </Link>
        ))}
      </div>
      <section
        aria-labelledby="managed-resources-heading"
        className="grid gap-4 border-t border-border pt-6"
      >
        <h2 id="managed-resources-heading" className="text-xl font-bold">
          {t('managedResourcesTitle')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <ManagedList kind="communities" query={communities} />
          <ManagedList kind="events" query={events} />
        </div>
      </section>
    </section>
  );
}
