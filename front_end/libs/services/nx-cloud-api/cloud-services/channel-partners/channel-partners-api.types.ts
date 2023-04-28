/** Swagger on {{licenseServerInstance}}/nxlicensed/api-docs-internal */

/** Integer for now, UUID string eventually */
export type Id = number;

// e.g. https://nxlicensed.test.hdw.mx/nxlicensed/api/v2/partners/organizations/5/users/
type Url = string;

/* Channel Partners */
export interface ChannelPartner {
    effectiveState: string;
    id: Id;
    name: string;
    organizations: Url;
    parentChannelPartner: Id | null;
    state: string;
    users: Url;
}

export interface CreateChannelPartner {
    name: string;
    parentChannelPartner: Id;
}

export type UpdateChannelPartner = Partial<{
    state: string;
    parentChannelPartner: Id;
    name: string;
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

export interface CreateChannelParterUser {
    email: string;
    role: string;
}

/* Organizations */
export interface Organization {
    channelPartner: Id;
    channelPartnerCanAdminster: boolean;
    cloudSystems: Url;
    effectiveState: string;
    id: Id;
    name: string;
    state: string;
    users: Url;
}

export interface CreateOrganization {
    name: string;
    channelPartner: Id;
}

/* Oraganization users */
export interface OrganizationRole {
    id: Id;
    name: string;
    permissions: string[];
    systemRole: string;
}
