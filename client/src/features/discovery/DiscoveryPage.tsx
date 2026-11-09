import { useTranslation } from 'react-i18next';
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
    modality,
    hasFilters,
    communities,
    events,
    cities,
    categories,
    updateFilter,
    changeKind,
    changePage,
    clearFilters,
  } = useDiscoveryPageState(i18n.language);
  const isCommunity = kind === 'communities';
  const results = isCommunity ? communities : events;

  usePageMetadata(t('discover'), t('discoverIntro'));

  return (
    <section className="grid gap-8" aria-labelledby="discovery-title">
      <header className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-soft-text">
          {t('brand')}
        </p>
        <h1 className="text-3xl font-extrabold sm:text-4xl" id="discovery-title">
          {t('discover')}
        </h1>
        <p className="max-w-2xl text-text-muted">{t('discoverIntro')}</p>
      </header>

      <DiscoveryFilters
        kind={kind}
        searchValue={params.get('q') ?? ''}
        cityValue={params.get('city') ?? ''}
        categoryValue={params.get('category') ?? ''}
        modalityValue={modality}
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
        onKindChange={changeKind}
      />

      <DiscoverySection
        kind={kind}
        title={isCommunity ? t('communityResults') : t('eventResults')}
        total={results.data?.total}
        results={results.data?.items}
        page={page}
        loading={results.isPending}
        error={results.isError}
        onRetry={() => void results.refetch()}
        hasMore={results.data?.hasMore ?? false}
        onPageChange={changePage}
      />
    </section>
  );
}
