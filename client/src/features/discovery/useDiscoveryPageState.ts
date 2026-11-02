import { useLocation, useSearchParams } from 'react-router';
import {
  useDiscoveryControllerCategories,
  useDiscoveryControllerCities,
  useDiscoveryControllerListCommunities,
  useDiscoveryControllerListEvents,
} from '@/api/generated/discovery/discovery';
import { languageCode } from '@/features/resources/resource-utils';
import { DISCOVERY_PAGE_SIZE, type DiscoveryKind } from './discovery-utils';

function resetPage(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('page');
  return next;
}

export function useDiscoveryPageState(language: string) {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const normalizedPath = pathname.replace(/\/+$/, '');
  const kind: DiscoveryKind =
    normalizedPath === '/communities'
      ? 'communities'
      : normalizedPath === '/events'
        ? 'events'
        : 'all';
  const requestedPage = Number(params.get('page') ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const filterKeys =
    kind === 'communities'
      ? ['q', 'city', 'category']
      : [
          'q',
          'city',
          'category',
          'from',
          'to',
          'modality',
          'cityScope',
          'upcoming',
          'nonCancelled',
        ];
  const hasFilters = filterKeys.some((key) => params.has(key));
  const lang = languageCode(language);
  const communityParams = {
    ...(params.get('q') ? { q: params.get('q')! } : {}),
    ...(params.get('city') ? { city: params.get('city')! } : {}),
    ...(params.get('category') ? { category: params.get('category')! } : {}),
    lang,
    page: kind === 'all' ? 1 : page,
    pageSize: kind === 'all' ? 6 : DISCOVERY_PAGE_SIZE,
  };
  const eventParams = {
    ...communityParams,
    ...(params.get('from') ? { from: params.get('from')! } : {}),
    ...(params.get('to') ? { to: params.get('to')! } : {}),
    ...(params.get('modality') === 'online' || params.get('modality') === 'in-person'
      ? { modality: params.get('modality') as 'online' | 'in-person' }
      : {}),
    ...(params.get('cityScope') === 'include-online' || params.get('cityScope') === 'strict'
      ? { cityScope: params.get('cityScope') as 'include-online' | 'strict' }
      : {}),
    ...(params.has('upcoming') ? { upcoming: params.get('upcoming') === 'true' } : {}),
    ...(params.has('nonCancelled') ? { nonCancelled: params.get('nonCancelled') === 'true' } : {}),
  };
  const communities = useDiscoveryControllerListCommunities(communityParams, {
    query: { enabled: kind !== 'events' },
  });
  const events = useDiscoveryControllerListEvents(eventParams, {
    query: { enabled: kind !== 'communities' },
  });
  const cities = useDiscoveryControllerCities();
  const categories = useDiscoveryControllerCategories();

  const updateFilter = (key: 'q' | 'city' | 'category' | 'from' | 'to', value: string): void => {
    const next = resetPage(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'from' && value && next.get('to') && value > next.get('to')!) next.delete('to');
    setParams(next, { preventScrollReset: true });
  };

  const changePage = (nextPage: number): void => {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setParams(next, { preventScrollReset: true });
  };

  const clearFilters = (): void => {
    const next = new URLSearchParams(params);
    for (const key of [
      'q',
      'city',
      'category',
      'from',
      'to',
      'modality',
      'cityScope',
      'upcoming',
      'nonCancelled',
      'page',
    ])
      next.delete(key);
    setParams(next, { preventScrollReset: true });
  };

  const listingParams = resetPage(params);
  if (kind === 'communities') {
    listingParams.delete('from');
    listingParams.delete('to');
    for (const key of ['modality', 'cityScope', 'upcoming', 'nonCancelled'])
      listingParams.delete(key);
  }
  const listingQuery = listingParams.toString();
  const communityPathParams = new URLSearchParams(listingParams);
  communityPathParams.delete('from');
  communityPathParams.delete('to');
  for (const key of ['modality', 'cityScope', 'upcoming', 'nonCancelled'])
    communityPathParams.delete(key);
  const communityQuery = communityPathParams.toString();
  const allPath = `/discover${listingQuery ? `?${listingQuery}` : ''}`;
  const communityPath = `/communities${communityQuery ? `?${communityQuery}` : ''}`;
  const eventPath = `/events${listingQuery ? `?${listingQuery}` : ''}`;

  return {
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
  };
}
