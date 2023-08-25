// e.g. https://nxlicensed.test.hdw.mx/nxlicensed/api/v2/partners/organizations/5/users/
type Url = string;

export enum State {
    Active = 'active',
    Suspended = 'suspended',
    ShutDown = 'shutdown',
}

export type Page<Results> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Results[];
};

/* Channel Partner Users */
export interface ChannelPartnerRole {
    id: number;
    permissions: string[];
    name: string;
}

export interface ChannelPartnerUser {
    email: string;
    roles: string[];
    title: string;
    created: string; // e.g. "2023-08-24T19:14:46.748Z"
}

export interface CreateChannelPartnerUser {
    email: string;
    role: string;
    title?: string;
}

export type UpdateChannelPartnerUser = CreateChannelPartnerUser;

/* Channel Partners */
export interface ChannelPartner {
    id: string;
    users: Url;
    organizations: Url;
    state: State;
    effectiveState: State;
    parentChannelPartner: string | null;
    monthlyAdditionalServiceLimit: number | null;
    attributes: Record<string, unknown>;
    canCreateSubChannels: boolean;
    name: string;
}

export type PaginatedChannelPartnerList = Page<ChannelPartner>;

export interface CreateChannelPartner {
    name: string;
    parentChannelPartner: string;
    attributes?: Record<string, unknown>;
    canCreateSubChannels?: boolean;
    monthlyAdditionalServiceLimit?: number | null;
}

export type UpdateChannelPartner = Partial<{
    state: State;
    monthlyAdditionalServiceLimit: number | null;
    attributes: Record<string, unknown>;
    canCreateSubChannels: boolean;
    name: string;
}>;

/* Organizations */
export interface Organization {
    id: string;
    users: Url;
    cloudSystems: Url;
    state: State;
    effectiveState: State;
    channelPartner: string;
    channelPartnerCanAdminister: boolean;
    attributes: Record<string, unknown>;
    name: string;
}

export type PaginatedOrganizationList = Page<Organization>;

export interface CreateOrganization {
    name: string;
    channelPartner: string;
    attributes?: Record<string, unknown>;
}

export type UpdateOrganization = Partial<{
    state: State;
    channelPartner: string;
    channelPartnerCanAdminister: boolean;
    attributes?: Record<string, unknown>;
    name: string;
}>;

/* Systems */
export interface CloudSystem {
    id: number;
    state: string;
    effectiveState: string;
    systemId: string;
    name: string;
    organization: string;
    services: Record<string, unknown>;
}

export type PaginatedCloudSystemList = Page<CloudSystem>;

export interface BindSystemToOrganization {
    cloudSystemId: string;
    organization?: string;
}

/* Oraganization users */
export interface OrganizationRole {
    id: number;
    permissions: string[];
    systemRole: string;
    name: string;
}

export interface OrganizationUser {
    email: string;
    roles: string[];
    title: string;
    created: string;
}

export interface CreateOrganizationUser {
    email: string;
    role: string;
    title?: string;
}

export type UpdateOrganizationUser = CreateOrganizationUser;
