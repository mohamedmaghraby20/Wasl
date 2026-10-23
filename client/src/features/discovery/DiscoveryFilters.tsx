import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryPublicDto, CityPublicDto } from '@/api/generated/wasl-client.schemas';
import { QueryError } from '@/components/feedback/QueryError';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { localizedName } from '@/features/resources/resource-utils';
import type { DiscoveryKind } from './discovery-utils';

const filterControlClass = 'shrink-0 sm:w-44';

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
      aria-label={t('discoveryTitle')}
      className="grid gap-3 rounded-(--shape-radius-card) border border-border bg-card p-3 shadow-xs sm:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(searchDraft.trim());
      }}
      role="search"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
          />
          <input
            aria-label={t('search')}
            className="h-11 w-full rounded-(--shape-radius-control) border border-input bg-background ps-9 pe-9 text-sm text-text shadow-xs transition-[border-color,box-shadow] duration-(--motion-duration-fast) placeholder:text-text-subtle hover:border-border-strong aria-invalid:border-danger"
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder={t('searchHint')}
            type="search"
            value={searchDraft}
          />
          {searchDraft ? (
            <button
              aria-label={t('clearSearch')}
              className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-text-subtle transition-colors hover:bg-surface-soft hover:text-text"
              onClick={() => {
                setSearchDraft('');
                onSearch('');
              }}
              tabIndex={-1}
              title={t('clearSearch')}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        <Button className="sm:px-6" type="submit">
          <Search aria-hidden="true" className="hidden sm:block" />
          {t('search')}
        </Button>
      </div>

      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <Select
          aria-busy={citiesPending}
          aria-label={t('allCities')}
          className={filterControlClass}
          disabled={citiesPending || citiesError || !cities}
          onValueChange={(value) => onFilterChange('city', value)}
          options={(cities ?? []).map((city) => ({
            value: city.id,
            label: localizedName(city, i18n.language),
          }))}
          placeholder={citiesPending ? t('loadingCities') : t('allCities')}
          value={cityValue}
        />
        <Select
          aria-busy={categoriesPending}
          aria-label={t('allCategories')}
          className={filterControlClass}
          disabled={categoriesPending || categoriesError || !categories}
          onValueChange={(value) => onFilterChange('category', value)}
          options={(categories ?? []).map((category) => ({
            value: category.id,
            label: localizedName(category, i18n.language),
          }))}
          placeholder={categoriesPending ? t('loadingCategories') : t('allCategories')}
          value={categoryValue}
        />
        {kind !== 'communities' ? (
          <>
            <DatePicker
              className="w-full shrink-0 sm:w-44"
              label={t('fromDate')}
              onChange={(value) => onFilterChange('from', value)}
              placeholder={t('fromDate')}
              value={fromValue}
            />
            <DatePicker
              className="w-full shrink-0 sm:w-44"
              label={t('toDate')}
              min={fromValue}
              onChange={(value) => onFilterChange('to', value)}
              placeholder={t('toDate')}
              value={toValue}
            />
          </>
        ) : null}
        {showClear ? (
          <Button
            className="col-span-2 justify-self-start text-text-muted sm:col-span-1"
            onClick={onClear}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" />
            {t('clearFilters')}
          </Button>
        ) : null}
      </div>

      {citiesError || categoriesError ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {citiesError ? (
            <QueryError
              message={t('loadError', {
                resource: t('allCities').toLocaleLowerCase(i18n.language),
              })}
              onRetry={onRetryCities}
            />
          ) : null}
          {categoriesError ? (
            <QueryError
              message={t('loadError', {
                resource: t('allCategories').toLocaleLowerCase(i18n.language),
              })}
              onRetry={onRetryCategories}
            />
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
