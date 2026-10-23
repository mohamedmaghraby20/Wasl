import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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

  const tabs = [
    { key: 'all', label: t('discover'), to: allPath },
    { key: 'communities', label: t('communities'), to: communityPath },
    { key: 'events', label: t('events'), to: eventPath },
  ];

  return (
    <section className="grid gap-8" aria-labelledby="discovery-title">
      <header className="grid gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-soft-text">
            {t('brand')}
          </p>
          <h1 className="text-3xl font-extrabold sm:text-4xl" id="discovery-title">
            {title}
          </h1>
          <p className="max-w-2xl text-text-muted">{t('discoverIntro')}</p>
        </div>

        <nav aria-label={t('resourceTypesNavigation')}>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-surface-soft p-1">
            {tabs.map((tab) => (
              <Link
                aria-current={kind === tab.key ? 'page' : undefined}
                className={
                  kind === tab.key
                    ? 'rounded-full bg-card px-4 py-1.5 text-sm font-semibold text-text shadow-xs'
                    : 'rounded-full px-4 py-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text'
                }
                key={tab.key}
                to={tab.to}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

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
