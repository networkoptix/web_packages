/** Swagger on {{licenseServerInstance}}/nxlicensed/api-docs-internal */

export type Id = string;

// e.g. https://nxlicensed.test.hdw.mx/nxlicensed/api/v2/partners/organizations/5/users/
type Url = string;

export enum State {
    Active = 'active',
    Suspended = 'suspended',
    ShutDown = 'shutdown',
}

/* Channel Partners */
export interface ChannelPartner {
    effectiveState: State;
    id: Id;
    name: string;
    organizations: Url;
    parentChannelPartner: Id | null;
    state: State;
    users: Url;
}

export interface CreateChannelPartner {
    name: string;
    parentChannelPartner: Id;
}

export type UpdateChannelPartner = Partial<{
    name: string;
    parentChannelPartner: Id;
    state: State;
}>;

/* Channel Partner Users */
export interface ChannelPartnerRole {
    id: Id;
    name: string;
    permissions: string[];
}

export interface ChannelPartnerUser {
    email: string;
    roles: string[];
    userId: Id;
}

export interface CreateChannelPartnerUser {
    email: string;
    role: string;
}

export type UpdateChannelPartnerUser = CreateChannelPartnerUser;

/* Organizations */
export interface Organization {
    channelPartner: Id;
    channelPartnerCanAdminister: boolean;
    cloudSystems: Url;
    effectiveState: State;
    id: Id;
    name: string;
    state: State;
    users: Url;
}

export type UpdateOrganization = Partial<{
    channelPartner: Id;
    channelPartnerCanAdminister: boolean;
    name: string;
    state: State;
}>;

export interface CreateOrganization {
    channelPartner: Id;
    name: string;
}

/* Oraganization users */
export interface OrganizationRole {
    id: Id;
    name: string;
    permissions: string[];
    systemRole: string;
}

export interface OrganizationUser {
    email: string;
    roles: string[];
    userId: Id;
}

export interface CreateOrganizationUser {
    email: string;
    role: string;
}

export type UpdateOrganizationUser = CreateOrganizationUser;

/* Systems */
export interface OrganizationSystem {
    id: number;
    state: string;
    effectiveState?: string;
    systemId: Id;
    name: string;
    organization: string;
}

export interface BindSystemToOrganization {
    cloudSystemId: string;
    organization: string;
}
