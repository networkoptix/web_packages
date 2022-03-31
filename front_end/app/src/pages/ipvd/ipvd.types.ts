export type IpvdParams = Partial<{
  search: string;
  tags: string;
  vendors: string;

  sortBy: string;
  page: string;
  camera: string;

  debug: string;
  beta: string;
}>;

export interface Disclaimer {
  companyName: string;
  vmsName: string;
}
