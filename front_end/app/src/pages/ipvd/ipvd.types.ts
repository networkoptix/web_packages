import type { SearchParams } from '@components/search/search.component.types';

export type IpvdParams = SearchParams & Partial<{
  vendors: string;

  sortBy: string;
  camera: string;

  resolution: string;
  hardwareTypes: string;

  debug: string;
  beta: string;
}>;

export interface Disclaimer {
  companyName: string;
  vmsName: string;
}
