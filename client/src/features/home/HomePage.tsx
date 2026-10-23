import { ArrowRight, Eye } from 'lucide-react';
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
    <div className="grid gap-12">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-primary/20 bg-primary-soft">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-28 -top-28 size-80 rounded-full border border-primary/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-6 top-16 size-48 rounded-full border border-primary/25"
        />
        <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:p-12">
          <div className="grid content-center gap-5">
            <h1 className="max-w-[16ch] font-heading text-[length:var(--font-size-display)] font-extrabold leading-[1.06] tracking-tight">
              {t('welcome')}
            </h1>
            <p className="max-w-(--container-reading) text-base leading-relaxed text-text-muted">
              {t('starter')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to="/communities">
                  {t('browseCommunities')}
                  <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/events">{t('browseEvents')}</Link>
              </Button>
            </div>
            <p className="inline-flex items-center gap-2 text-xs font-medium text-text-subtle">
              <Eye aria-hidden="true" className="size-4" />
              {t('browseWithoutSignIn')}
            </p>
          </div>

          <Form
            action="/discover"
            aria-label={t('homeSearchLabel')}
            className="grid gap-3 rounded-(--shape-radius-xl) border border-border bg-card p-5 shadow-md sm:p-6"
            method="get"
            role="search"
          >
            <label className="text-sm font-semibold text-text" htmlFor="home-search">
              {t('homeSearchLabel')}
            </label>
            <input
              className="h-11 min-w-0 rounded-(--shape-radius-control) border border-input bg-background px-3 text-sm text-text shadow-xs transition-[border-color] duration-(--motion-duration-fast) placeholder:text-text-subtle hover:border-border-strong"
              id="home-search"
              name="q"
              placeholder={t('exploreByName')}
              type="search"
            />
            <Button block type="submit">
              {t('search')}
            </Button>
          </Form>
        </div>
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
