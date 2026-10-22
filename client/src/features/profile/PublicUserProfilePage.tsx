import { useHead } from '@unhead/react';
import { CircleUserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useUsersControllerPublicProfile } from '@/api/generated/users/users';
import { QueryError } from '@/components/feedback/QueryError';
import { languageCode } from '@/features/resources/resource-utils';

export function PublicUserProfilePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const lang = languageCode(i18n.language);
  const profile = useUsersControllerPublicProfile(id, { lang }, { query: { enabled: Boolean(id) } });
  useHead({
    title: profile.data?.displayName ?? t('publicProfileTitle'),
    meta: [{ name: 'description', content: profile.data?.bio || t('publicProfileIntro') }],
    link: [{ rel: 'canonical', href: `${window.location.origin}/users/${id}` }],
  });

  if (profile.isPending) return <p role="status">{t('loadingProfile')}</p>;
  if (profile.isError) {
    return <QueryError message={t('profileLoadError')} onRetry={() => void profile.refetch()} />;
  }

  const person = profile.data;
  const initials = person.displayName.trim().slice(0, 1).toLocaleUpperCase(i18n.language);
  return (
    <article className="mx-auto max-w-(--container-reading) space-y-7">
      <header className="grid gap-5 border-b border-border pb-6 sm:grid-cols-[8rem_1fr] sm:items-center">
        {person.avatarUrl ? (
          <img alt="" className="size-28 rounded-full border border-border object-cover" src={person.avatarUrl} />
        ) : (
          <div className="grid size-28 place-items-center rounded-full bg-primary-soft text-3xl font-bold text-primary-soft-text">
            {initials || <CircleUserRound aria-hidden="true" size={42} />}
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{t('publicProfileTitle')}</p>
          <h1 className="mt-1 break-words font-heading text-3xl font-bold tracking-tight">{person.displayName}</h1>
          {person.cityName && <p className="mt-2 text-sm text-muted-foreground">{person.cityName}</p>}
        </div>
      </header>
      <section className="grid gap-2">
        <h2 className="font-heading text-lg font-semibold">{t('profileAbout')}</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {person.bio || t('profileBioEmpty')}
        </p>
      </section>
      <section className="grid gap-3">
        <h2 className="font-heading text-lg font-semibold">{t('profileInterests')}</h2>
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
      </section>
    </article>
  );
}
