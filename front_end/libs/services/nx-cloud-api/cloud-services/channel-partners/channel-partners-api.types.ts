// e.g. https://nxlicensed.test.hdw.mx/nxlicensed/api/v2/partners/organizations/5/users/

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
    state: State;
    effectiveState: string;
    parentChannelPartner: string;
    monthlyAdditionalServiceLimit: number | null;
    attributes: Record<string, unknown>;
    supportInformation: SupportInformation;
    created: string;
    ownPermissions: string[];
    ownRoles: string[];
    name: string;
    effective_state: number;
    created_ts: string;
    path: string[];
    users: number[];
}

export enum ChannelPartnerPermissions {
    ADD_REMOVE_SUB_CHANNEL_PARTNERS = 'add_remove_sub_channel_partners',
    MANAGE_USERS = 'manage_users',
    CONFIGURE_CHANNEL_PARTNER = 'configure_channel_partner',
    VIEW_SERVICE_REPORTS = 'view_service_reports',
    ALTER_STATE_ORGANIZATIONS = 'alter_state_organizations',
    ADD_REMOVE_SERVICE_QUANTITIES = 'add_remove_service_quantities',
    ADMINISTER_ORGANIZATION_SYSTEMS = 'administer_organization_systems',
    ADD_REMOVE_ORGANIZATIONS = 'add_remove_organizations',
    FIELD_ACCESS_CP_ADMIN = 'field_access_cp_admin',
    ALTER_STATE_SUB_CHANNEL_PARTNERS = 'alter_state_sub_channel_partners',
    FIELD_ACCESS_CP_MANAGER = 'field_access_cp_manager',
    FIELD_ACCESS_CP_ACCOUNTANT = 'field_access_cp_accountant',
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
    attributes: Record<string, unknown>;
    channelPartner: string;
    channelPartnerAccessLevel: null | string;
    created: string;
    currentServices: Record<string, unknown>;
    effectiveState: string;
    effective_state: number;
    id: string;
    name: string;
    ownPermissions: string[];
    ownRoles: string[];
    ownRoleIds: string[];
    state: State;
    users: number[];
}

export enum OrgPermissions {
    MANAGE_USERS = 'manage_users',
    CONFIGURE_ORGANIZATION = 'configure_organization',
    MANAGE_SYSTEMS = 'manage_systems',
    VIEW_SERVICE_REPORTS = 'view_service_reports',
    VIEW_HEALTH_MONITORING = 'view_health_monitoring',
    FIELD_ACCESS_ORG_ADMIN = 'field_access_org_admin',
    ACCESS_SYSTEMS = 'access_systems',
    FIELD_ACCESS_ORG_POWER_USER = 'field_access_org_power_user',
    FIELD_ACCESS_ORG_OTHER = 'field_access_org_other',
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
    channelPartnerAccessLevel: string;
    attributes?: Record<string, unknown>;
    currentServices?: Record<string, unknown>;
    name: string;
    effective_state: number;
    path: string[];
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
    id: string;
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
    roleId: string;
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
