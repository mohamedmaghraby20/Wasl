import { useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  useDiscoveryControllerCategories,
  useDiscoveryControllerCities,
  useDiscoveryControllerListCommunities,
  useDiscoveryControllerListEvents,
} from '@/api/generated/discovery/discovery';
import { languageCode, type ResourceKind } from '@/features/resources/resource-utils';
import { DISCOVERY_EVENT_PAGE_SIZE, DISCOVERY_PAGE_SIZE } from './discovery-utils';

function resetPage(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('page');
  return next;
}

export function useDiscoveryPageState(language: string) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind: ResourceKind =
    pathname.replace(/\/+$/, '') === '/communities' ? 'communities' : 'events';
  const requestedPage = Number(params.get('page') ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedModality = params.get('modality');
  const modality: '' | 'online' | 'in-person' =
    requestedModality === 'online' || requestedModality === 'in-person' ? requestedModality : '';
  const filterKeys =
    kind === 'communities'
      ? ['q', 'city', 'category', 'order']
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
    page,
    pageSize: DISCOVERY_PAGE_SIZE,
  };
  const eventParams = {
    ...communityParams,
    pageSize: DISCOVERY_EVENT_PAGE_SIZE,
    ...(params.get('from') ? { from: params.get('from')! } : {}),
    ...(params.get('to') ? { to: params.get('to')! } : {}),
    ...(modality ? { modality } : {}),
    ...(params.get('cityScope') === 'include-online' || params.get('cityScope') === 'strict'
      ? { cityScope: params.get('cityScope') as 'include-online' | 'strict' }
      : {}),
    ...(params.has('upcoming') ? { upcoming: params.get('upcoming') === 'true' } : {}),
    ...(params.has('nonCancelled') ? { nonCancelled: params.get('nonCancelled') === 'true' } : {}),
  };
  const communities = useDiscoveryControllerListCommunities(
    {
      ...communityParams,
      ...(params.get('order') === 'member-count' || params.get('order') === 'newest'
        ? { order: params.get('order') as 'member-count' | 'newest' }
        : {}),
    },
    {
      query: { enabled: kind === 'communities' },
    },
  );
  const events = useDiscoveryControllerListEvents(eventParams, {
    query: { enabled: kind === 'events' },
  });
  const cities = useDiscoveryControllerCities();
  const categories = useDiscoveryControllerCategories();

  const updateFilter = (
    key: 'q' | 'city' | 'category' | 'from' | 'to' | 'modality',
    value: string,
  ): void => {
    const next = resetPage(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'from' && value && next.get('to') && value > next.get('to')!) next.delete('to');
    setParams(next, { preventScrollReset: true });
  };

  const changeKind = (nextKind: ResourceKind): void => {
    if (nextKind === kind) return;
    const next = resetPage(params);
    const incompatibleKeys =
      nextKind === 'communities'
        ? ['from', 'to', 'modality', 'cityScope', 'upcoming', 'nonCancelled']
        : ['order'];
    for (const key of incompatibleKeys) next.delete(key);
    const query = next.toString();
    void navigate(`/${nextKind}${query ? `?${query}` : ''}`, { preventScrollReset: true });
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
      'order',
    ])
      next.delete(key);
    setParams(next, { preventScrollReset: true });
  };

  return {
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
  };
}
