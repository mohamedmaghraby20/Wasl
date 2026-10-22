import { Form, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSeoMeta } from '@unhead/react';
import { Button } from '@/components/ui/Button';
import { HomeSection } from './HomeSection';
import {
  useDiscoveryControllerListCommunities,
  useDiscoveryControllerListEvents,
} from '@/api/generated/discovery/discovery';

export function HomePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const communities = useDiscoveryControllerListCommunities({ pageSize: 3, lang });
  const events = useDiscoveryControllerListEvents({ pageSize: 3, lang });
  useSeoMeta({
    title: t('welcome'),
    description: t('starter'),
    ogTitle: t('welcome'),
    ogDescription: t('starter'),
    ogType: 'website',
  });
  return (
    <div className="grid gap-10">
      <section className="grid items-center gap-8 rounded-(--shape-radius-dialog) bg-primary-soft p-(--card-padding) lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="grid content-center gap-5">
          <h1 className="max-w-[15ch] font-heading text-[length:var(--font-size-display)] font-extrabold leading-tight tracking-tight">
            {t('welcome')}
          </h1>
          <p className="max-w-(--container-reading) text-[color:var(--color-text-muted)]">
            {t('browseWithoutSignIn')}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--color-primary-soft-text)]">
            <Link
              className="rounded-sm hover:underline focus-visible:outline focus-visible:outline-2"
              to="/communities"
            >
              {t('browseCommunities')}
            </Link>
            <Link
              className="rounded-sm hover:underline focus-visible:outline focus-visible:outline-2"
              to="/events"
            >
              {t('browseEvents')}
            </Link>
          </div>
        </div>
        <Form
          action="/discover"
          aria-label={t('homeSearchLabel')}
          className="grid gap-3 rounded-(--shape-radius-xl) border border-border bg-card p-4 shadow-(--shadow-card) sm:p-6"
          method="get"
          role="search"
        >
          <label className="text-sm font-semibold" htmlFor="home-search">
            {t('homeSearchLabel')}
          </label>
          <input
            id="home-search"
            name="q"
            type="search"
            className="min-h-(--control-height-lg) min-w-0 rounded-(--shape-radius-control) border border-border bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            placeholder={t('exploreByName')}
          />
          <Button className="w-full" type="submit">
            {t('search')}
          </Button>
        </Form>
      </section>
      <HomeSection
        title={t('communities')}
        kind="communities"
        language={i18n.language}
        items={communities.data?.items}
        isPending={communities.isPending}
        isError={communities.isError}
        onRetry={() => void communities.refetch()}
      />
      <HomeSection
        title={t('events')}
        kind="events"
        language={i18n.language}
        items={events.data?.items}
        isPending={events.isPending}
        isError={events.isError}
        onRetry={() => void events.refetch()}
      />
    </div>
  );
}
