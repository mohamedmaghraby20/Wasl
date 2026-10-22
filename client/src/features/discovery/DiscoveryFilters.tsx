import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryPublicDto, CityPublicDto } from '@/api/generated/wasl-client.schemas';
import { Button } from '@/components/ui/Button';
import { QueryError } from '@/components/feedback/QueryError';
import { localizedName } from '@/features/resources/resource-utils';
import type { DiscoveryKind } from './discovery-utils';

export function DiscoveryFilters({
  kind,
  searchValue,
  cityValue,
  categoryValue,
  fromValue,
  toValue,
  cities,
  categories,
  citiesError,
  categoriesError,
  citiesPending,
  categoriesPending,
  onSearch,
  onFilterChange,
  onRetryCities,
  onRetryCategories,
  showClear,
  onClear,
}: {
  kind: DiscoveryKind;
  searchValue: string;
  cityValue: string;
  categoryValue: string;
  fromValue: string;
  toValue: string;
  cities: CityPublicDto[] | undefined;
  categories: CategoryPublicDto[] | undefined;
  citiesError: boolean;
  categoriesError: boolean;
  citiesPending: boolean;
  categoriesPending: boolean;
  onSearch: (value: string) => void;
  onFilterChange: (key: 'city' | 'category' | 'from' | 'to', value: string) => void;
  onRetryCities: () => void;
  onRetryCategories: () => void;
  showClear: boolean;
  onClear: () => void;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [searchDraft, setSearchDraft] = useState(searchValue);

  // The URL is the committed value; keep the form draft aligned after history navigation.
  useEffect(() => setSearchDraft(searchValue), [searchValue]);

  return (
    <form
      className="grid gap-3 rounded-(--shape-radius-card) bg-card p-4 shadow-(--shadow-card) sm:grid-cols-2 lg:grid-cols-5"
      aria-label={t('discoveryTitle')}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(searchDraft.trim());
      }}
    >
      <label className="flex items-center gap-2 rounded-md border border-border px-3 focus-within:outline focus-within:outline-2 focus-within:outline-ring">
        <Search aria-hidden="true" size={17} />
        <span className="sr-only">{t('search')}</span>
        <input
          className="min-w-0 flex-1 bg-transparent py-2 outline-none"
          placeholder={t('searchHint')}
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
      </label>
      <Button type="submit" variant="outline">
        {t('search')}
      </Button>
      <label className="grid gap-1 text-sm">
        <span>{t('allCities')}</span>
        <select
          className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          aria-busy={citiesPending}
          disabled={citiesPending || citiesError || !cities}
          value={cityValue}
          onChange={(event) => onFilterChange('city', event.target.value)}
        >
          <option value="">{citiesPending ? t('loadingCities') : t('allCities')}</option>
          {cities?.map((city) => (
            <option key={city.id} value={city.id}>
              {localizedName(city, i18n.language)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>{t('allCategories')}</span>
        <select
          className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          aria-busy={categoriesPending}
          disabled={categoriesPending || categoriesError || !categories}
          value={categoryValue}
          onChange={(event) => onFilterChange('category', event.target.value)}
        >
          <option value="">
            {categoriesPending ? t('loadingCategories') : t('allCategories')}
          </option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {localizedName(category, i18n.language)}
            </option>
          ))}
        </select>
      </label>
      {kind !== 'communities' && (
        <>
          <label className="grid gap-1 text-sm">
            <span>{t('fromDate')}</span>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              type="date"
              value={fromValue}
              onChange={(event) => onFilterChange('from', event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t('toDate')}</span>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              type="date"
              value={toValue}
              min={fromValue || undefined}
              onChange={(event) => onFilterChange('to', event.target.value)}
            />
          </label>
        </>
      )}
      {citiesError && (
        <QueryError
          message={t('loadError', { resource: t('allCities').toLocaleLowerCase(i18n.language) })}
          onRetry={onRetryCities}
        />
      )}
      {categoriesError && (
        <QueryError
          message={t('loadError', {
            resource: t('allCategories').toLocaleLowerCase(i18n.language),
          })}
          onRetry={onRetryCategories}
        />
      )}
      {showClear && (
        <Button
          className="sm:col-span-2 lg:col-span-5"
          onClick={onClear}
          type="button"
          variant="outline"
        >
          {t('clearFilters')}
        </Button>
      )}
    </form>
  );
}
