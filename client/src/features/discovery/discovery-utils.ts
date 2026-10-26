import type { ResourceKind } from '@/features/resources/resource-utils';

export type { ResourceKind } from '@/features/resources/resource-utils';
export type DiscoveryKind = ResourceKind | 'all';

export const DISCOVERY_PAGE_SIZE = 12;
