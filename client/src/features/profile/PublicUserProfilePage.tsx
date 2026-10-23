import { useHead } from '@unhead/react';
import { CircleUserRound, MapPin, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import {
  useUsersControllerCurrent,
  useUsersControllerPublicProfile,
} from '@/api/generated/users/users';
import { QueryError } from '@/components/feedback/QueryError';
import { languageCode } from '@/features/resources/resource-utils';
import { useAuth } from '@/features/auth/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function PublicUserProfilePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const { user } = useAuth();
  const lang = languageCode(i18n.language);
  const currentUser = useUsersControllerCurrent({ lang }, { query: { enabled: Boolean(user) } });
  const profile = useUsersControllerPublicProfile(
    id,
    { lang },
    { query: { enabled: Boolean(id) } },
  );
  useHead({
    title: profile.data?.displayName ?? t('publicProfileTitle'),
    meta: [{ name: 'description', content: profile.data?.bio || t('publicProfileIntro') }],
    link: [{ rel: 'canonical', href: `${window.location.origin}/users/${id}` }],
  });

  if (profile.isPending)
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
    <article className="mx-auto grid max-w-(--container-reading) gap-6">
      <header className="flex flex-wrap items-center gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
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
            {t('publicProfileTitle')}
          </p>
          <h1 className="mt-1 break-words text-3xl font-extrabold">{person.displayName}</h1>
          {person.cityName ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-muted">
              <MapPin aria-hidden="true" className="size-4" />
              {person.cityName}
            </p>
          ) : null}
        </div>
        {user && currentUser.data && currentUser.data.id !== id ? (
          <Button asChild variant="outline">
            <Link to={`/messages?to=${encodeURIComponent(id)}`}>
              <MessageSquare aria-hidden="true" />
              {t('startDirectMessage')}
            </Link>
          </Button>
        ) : null}
      </header>

      <div className="grid gap-5 rounded-(--shape-radius-card) border border-border bg-card p-6 shadow-xs">
        <section className="grid gap-1.5">
          <h2 className="text-sm font-semibold">{t('profileAbout')}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
            {person.bio || t('profileBioEmpty')}
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">{t('profileInterests')}</h2>
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
      </div>
    </article>
  );
}
