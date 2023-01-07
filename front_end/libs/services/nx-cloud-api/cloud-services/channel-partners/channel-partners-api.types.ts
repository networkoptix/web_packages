/** Swagger on {{licenseServerInstance}}/nxlicensed/api-docs-internal */

// import { uuid, int, email, datetime } from '../base-cloud-service-api.types';

export interface BrandInfo {
  id?: number,
  users?: string,
  channel_partners?: string,
  name: string,
  brand: number
}

export interface UserInfo {
  id?: number,
  email: string
}

export interface PartnerInfo {
  id?: number,
  users?: string,
  organizations?: string,
  name: string,
  customization?: number,
  parent_channel_partner: number
}

export interface OrganizationInfo {
  id: number,
  users: string,
  cloud_systems: string,
  name: string,
  channel_partner: number,
  customization: number
}
