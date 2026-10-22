import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { DiscoveryFilters } from './DiscoveryFilters';
import { DiscoverySection } from './DiscoverySection';
import { usePageMetadata } from './usePageMetadata';
import { useDiscoveryPageState } from './useDiscoveryPageState';

export function DiscoveryPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const {
    kind,
    page,
    params,
    hasFilters,
    communities,
    events,
    cities,
    categories,
    updateFilter,
    changePage,
    clearFilters,
    allPath,
    communityPath,
    eventPath,
  } = useDiscoveryPageState(i18n.language);
  const title = kind === 'all' ? t('discover') : t(kind);

  usePageMetadata(title, t('discoverIntro'));

  return (
    <section className="grid gap-6" aria-labelledby="discovery-title">
      <header>
        <p className="text-sm font-semibold text-[var(--color-primary-soft-text)]">Wasl</p>
        <h1 id="discovery-title" className="mt-1 text-3xl font-bold">
          {title}
        </h1>
        <p className="mt-2 text-[color:var(--color-text-muted)]">{t('discoverIntro')}</p>
      </header>

      <nav aria-label={t('resourceTypesNavigation')} className="flex flex-wrap gap-2">
        <Button asChild variant={kind === 'all' ? 'primary' : 'outline'}>
          <Link aria-current={kind === 'all' ? 'page' : undefined} to={allPath}>
            {t('discover')}
          </Link>
        </Button>
        <Button asChild variant={kind === 'communities' ? 'primary' : 'outline'}>
          <Link aria-current={kind === 'communities' ? 'page' : undefined} to={communityPath}>
            {t('communities')}
          </Link>
        </Button>
        <Button asChild variant={kind === 'events' ? 'primary' : 'outline'}>
          <Link aria-current={kind === 'events' ? 'page' : undefined} to={eventPath}>
            {t('events')}
          </Link>
        </Button>
      </nav>

      <DiscoveryFilters
        kind={kind}
        searchValue={params.get('q') ?? ''}
        cityValue={params.get('city') ?? ''}
        categoryValue={params.get('category') ?? ''}
        fromValue={params.get('from') ?? ''}
        toValue={params.get('to') ?? ''}
        cities={cities.data}
        categories={categories.data}
        citiesError={cities.isError}
        categoriesError={categories.isError}
        citiesPending={cities.isPending}
        categoriesPending={categories.isPending}
        onRetryCities={() => void cities.refetch()}
        onRetryCategories={() => void categories.refetch()}
        showClear={hasFilters}
        onClear={clearFilters}
        onSearch={(value) => updateFilter('q', value)}
        onFilterChange={updateFilter}
      />

      {kind !== 'events' && (
        <DiscoverySection
          kind="communities"
          title={t('communities')}
          results={communities.data?.items}
          page={page}
          loading={communities.isPending}
          error={communities.isError}
          onRetry={() => void communities.refetch()}
          pageSize={12}
          showExploreAll={kind === 'all'}
          exploreHref={communityPath}
          onPageChange={changePage}
        />
      )}
      {kind !== 'communities' && (
        <DiscoverySection
          kind="events"
          title={t('events')}
          results={events.data?.items}
          page={page}
          loading={events.isPending}
          error={events.isError}
          onRetry={() => void events.refetch()}
          pageSize={12}
          showExploreAll={kind === 'all'}
          exploreHref={eventPath}
          onPageChange={changePage}
        />
      )}
    </section>
  );
}
