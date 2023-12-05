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
    supportInformation: SupportInformation;
}

export interface SupportInformation {
    sites: string[];
    phones: Phone[];
    emails: Email[];
    custom: Custom[];
}

interface Phone {
    phone: string;
    description: string;
}

interface Email {
    email: string;
    description: string;
}

interface Custom {
    label: string;
    value: string;
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
    activated: boolean;
    created: string;
    id: number;
    groupId: string | null;
    name: string;
    organization: string;
    services: Record<string, unknown>;
    state: string;
    systemId: string;
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
    groupRoles: GroupRole[];
}

export interface GroupRole {
    groupId: string;
    roles: string[];
    roleIds: string[];
}

export interface CreateOrganizationUser {
    email: string;
    role: string;
    title?: string;
}

export type UpdateOrganizationUser = CreateOrganizationUser;

/* System Services */
export interface Service {
    quantity: number;
}

export interface SystemServices {
    services: Record<string, Service>;
}
export interface ServiceData {
    id: string;
    type: string;
    state: string;
    displayName: string;
    description: string;
    createdByChannelPartner: string;
    parameters: Record<string, string | number>;
    created: string;
}
/* Groups */
export interface GroupItem {
    id: string;
    roles: string[];
    name: string;
    parentId: string;
    children: GroupItem[];
}

export interface GetGroupItem extends GroupItem {
    systems: string[];
}

export interface CreateGroup {
    name: string;
    parentId: string;
    organizationId: string;
}

export interface PatchGroup {
    name: string;
    parentId: string;
}

/* Group Users */
export interface GroupUser {
    email: string;
    roles: string[];
    roleIds: string[];
}

export interface UpdateGroupUser {
    email: string;
    roleId: string;
}

export interface GroupUserCanAccess extends GroupUser {
    hasAccessTo?: {
        id: string;
        name: string;
        membershipType: string;
    };
}
