import { useHead } from '@unhead/react';
import { ArrowUpRight, Building2, CalendarPlus, UsersRound } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';

export function CreationStartPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  useHead({ title: t('create') });

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (loading) return <p role="status">{t('authWorking')}</p>;

  return (
    <section className="mx-auto max-w-(--container-reading) space-y-8">
      <header className="max-w-2xl border-b border-border pb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t('createTitle')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('createIntro')}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          className="group flex min-h-52 flex-col justify-between border-s-4 border-primary bg-card p-6 shadow-(--shadow-card) transition-colors hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
          to="/create/community"
        >
          <UsersRound aria-hidden="true" className="text-primary-soft-text" size={28} />
          <div>
            <h2 className="font-heading text-xl font-bold">{t('createCommunityTitle')}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('createCommunityIntro')}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-soft-text">
              {t('createCommunityAction')}
              <ArrowUpRight aria-hidden="true" size={16} />
            </span>
          </div>
        </Link>
        <Link
          className="group flex min-h-52 flex-col justify-between border-s-4 border-secondary-foreground/30 bg-card p-6 shadow-(--shadow-card) transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
          to="/create/event"
        >
          <CalendarPlus aria-hidden="true" className="text-primary-soft-text" size={28} />
          <div>
            <h2 className="font-heading text-xl font-bold">{t('createEventTitle')}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('createEventIntro')}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-soft-text">
              {t('createEventAction')}
              <ArrowUpRight aria-hidden="true" size={16} />
            </span>
          </div>
        </Link>
        <Link
          className="group flex min-h-52 flex-col justify-between border-s-4 border-primary bg-card p-6 shadow-(--shadow-card) transition-colors hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
          to="/create/organization"
        >
          <Building2 aria-hidden="true" className="text-primary-soft-text" size={28} />
          <div>
            <h2 className="font-heading text-xl font-bold">{t('createOrganizationTitle')}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('createOrganizationIntro')}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-soft-text">
              {t('createOrganizationAction')}
              <ArrowUpRight aria-hidden="true" size={16} />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
