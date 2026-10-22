import { useHead } from '@unhead/react';
import { ArrowUpRight, CircleUserRound, PencilLine } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useUsersControllerCurrent } from '@/api/generated/users/users';
import { QueryError } from '@/components/feedback/QueryError';
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
  if (loading || profile.isPending) return <p role="status">{t('loadingProfile')}</p>;
  if (profile.isError) {
    return <QueryError message={t('profileLoadError')} onRetry={() => void profile.refetch()} />;
  }

  const person = profile.data;
  const initials = person.displayName.trim().slice(0, 1).toLocaleUpperCase(i18n.language);
  return (
    <section className="mx-auto max-w-(--container-reading) space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">{t('profileTitle')}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t('profileIntro')}
          </p>
        </div>
        <Button asChild>
          <Link to="/profile/edit">
            <PencilLine aria-hidden="true" size={17} />
            {t('editProfile')}
          </Link>
        </Button>
      </header>

      <article className="grid gap-7 sm:grid-cols-[9rem_1fr] sm:items-start">
        {person.avatarUrl ? (
          <img
            alt=""
            className="size-32 rounded-full border border-border object-cover"
            src={person.avatarUrl}
          />
        ) : (
          <div className="grid size-32 place-items-center rounded-full bg-primary-soft text-4xl font-bold text-primary-soft-text">
            {initials || <CircleUserRound aria-hidden="true" size={44} />}
          </div>
        )}
        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">{t('profileNameLabel')}</p>
            <h2 className="mt-1 break-words font-heading text-2xl font-bold">{person.displayName}</h2>
            {person.cityName && <p className="mt-1 text-sm text-muted-foreground">{person.cityName}</p>}
          </div>

          <div className="grid gap-1">
            <h3 className="text-sm font-semibold">{t('profileAbout')}</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {person.bio || t('profileBioEmpty')}
            </p>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold">{t('profileInterests')}</h3>
            {person.interests.length ? (
              <ul className="flex flex-wrap gap-2">
                {person.interests.map((interest) => (
                  <li className="rounded-full bg-secondary px-3 py-1.5 text-sm" key={interest}>
                    {interest}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('profileInterestsEmpty')}</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{t('accountEmail')}</p>
            <p className="mt-1 break-all text-sm">{person.email}</p>
          </div>
          <Link
            className="inline-flex min-h-(--control-height-md) items-center gap-2 text-sm font-semibold text-primary-soft-text underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
            to={`/users/${person.id}`}
          >
            {t('viewPublicProfile')}
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </article>
    </section>
  );
}
