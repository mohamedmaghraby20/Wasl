import { useHead } from '@unhead/react';
import { ArrowUpRight, CircleUserRound, MapPin, PencilLine } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUsersControllerCurrent } from '@/api/generated/users/users';
import { QueryError } from '@/components/feedback/QueryError';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';

export function ProfilePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  const lang = languageCode(i18n.language);
  const profile = useUsersControllerCurrent({ lang }, { query: { enabled: Boolean(user) } });
  useHead({ title: t('profileTitle') });

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (loading || profile.isPending)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('loadingProfile')}
      </p>
    );
  if (profile.isError) {
    return <QueryError message={t('profileLoadError')} onRetry={() => void profile.refetch()} />;
  }

  const person = profile.data;
  const initials = person.displayName.trim().slice(0, 1).toLocaleUpperCase(i18n.language);
  return (
    <section className="mx-auto grid max-w-(--container-reading) gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('profileTitle')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('profileIntro')}</p>
      </header>

      <article className="grid gap-6">
        <div className="flex flex-wrap items-center gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
          {person.avatarUrl ? (
            <img
              alt=""
              className="size-24 shrink-0 rounded-full border border-border object-cover"
              src={person.avatarUrl}
            />
          ) : (
            <div className="grid size-24 shrink-0 place-items-center rounded-full bg-primary-soft text-3xl font-bold text-primary-soft-text">
              {initials || <CircleUserRound aria-hidden="true" size={38} />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
              {t('profileNameLabel')}
            </p>
            <h2 className="mt-1 break-words text-2xl font-bold">{person.displayName}</h2>
            {person.cityName ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-muted">
                <MapPin aria-hidden="true" className="size-4" />
                {person.cityName}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/profile/edit">
                <PencilLine aria-hidden="true" />
                {t('editProfile')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/users/${person.id}`}>
                {t('viewPublicProfile')}
                <ArrowUpRight aria-hidden="true" className="rtl:rotate-90" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
          <section className="grid gap-1.5">
            <h3 className="text-sm font-semibold">{t('profileAbout')}</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
              {person.bio || t('profileBioEmpty')}
            </p>
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">{t('profileInterests')}</h3>
            {person.interests.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {person.interests.map((interest) => (
                  <li key={interest}>
                    <Badge variant="primary">{interest}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">{t('profileInterestsEmpty')}</p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              {t('accountEmail')}
            </p>
            <p className="break-all text-sm text-text">{person.email}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
