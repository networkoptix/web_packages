// e.g. https://nxlicensed.test.hdw.mx/nxlicensed/api/v2/partners/organizations/5/users/

import { Validators } from '@angular/forms';

export enum State {
    Active = 'active',
    Suspended = 'suspended',
    ShutDown = 'shutdown',
}

export enum OrgRoleIds {
    OrgAdmin = '00000000-0000-4000-8000-000000000001',
    Admin = '00000000-0000-4000-8000-000000000002',
    PowerUser = '00000000-0000-4000-8000-000000000003',
    SysHealthViewer = '00000000-0000-4000-8000-000000000004',
    AdvancedViewer = '00000000-0000-4000-8000-000000000005',
    Viewer = '00000000-0000-4000-8000-000000000006',
    LiveViewer = '00000000-0000-4000-8000-000000000007',
}

export type Page<Results> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Results[];
};

/* Channel Partner Users */
export interface ChannelPartnerRole {
    id: string;
    permissions: string[];
    name: string;
}

export interface ChannelPartnerUser {
    email: string;
    roles: string[];
    rolesIds: string[];
    title: string;
    fullName: string;
    created: string; // e.g. "2023-08-24T19:14:46.748Z"
}

export interface CreateChannelPartnerUser {
    email: string;
    roleId: string;
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
    supportInformation: SupportInformationSever;
    created: string;
    ownPermissions: string[];
    ownRoles: string[];
    ownRolesIds: string[];
    name: string;
    effective_state: number;
    created_ts: string;
    path: string[];
    users: number[];
    organizationCount: number;
    partnerCount: number;
}

export enum ChannelPartnerPermissions {
    ADD_REMOVE_SUB_CHANNEL_PARTNERS = 'add_remove_sub_channel_partners',
    MANAGE_USERS = 'manage_users',
    CONFIGURE_CHANNEL_PARTNER = 'configure_channel_partner',
    CONFIGURE_ORGANIZATION = 'configure_organization',
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

export enum ChannelPartnerRoles {
    ADMINISTRATOR = 'Administrator',
    MANAGER = 'Manager',
    REPORTS_VIEWER = 'Reports Viewer',
}

export enum ChannelPartnerRoleIds {
    ADMINISTRATOR = '00000000-0000-4000-8000-000000000001',
    MANAGER = '00000000-0000-4000-8000-000000000002',
    REPORTS_VIEWER = '00000000-0000-4000-8000-000000000003',
}

export interface InfoRowServer {
    value: string;
    description: string;
}

export interface CustomRowServer {
    label: string;
    value: string | null;
}

export interface InfoRow {
    data: { value: string; validation?: Validators[] };
    description?: { value: string | null; validation?: Validators[] };
}

export type InfoDataServer = InfoRowServer | CustomRowServer;

export interface SupportInformationSever {
    sites: InfoRowServer[];
    phones: InfoRowServer[];
    emails: InfoRowServer[];
    custom: CustomRowServer[];
}

export interface SupportInformation {
    sites: InfoRow[]; /// API returns string[] but for simplicity we'll massage the data
    phones: InfoRow[];
    emails: InfoRow[];
    custom: InfoRow[];
}

export type PaginatedChannelPartnerList = Page<ChannelPartner>;

export interface CreateChannelPartner {
    name: string;
    parentChannelPartner: string;
    attributes?: Record<string, unknown>;
    canCreateSubChannels?: boolean;
    monthlyAdditionalServiceLimit?: number | null;
    firstAdminEmail?: string;
}

export type UpdateChannelPartner = Partial<{
    state: State;
    monthlyAdditionalServiceLimit: number | null;
    attributes: Record<string, unknown>;
    canCreateSubChannels: boolean;
    name: string;
    supportInformation: SupportInformationSever;
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
    systemCount: number;
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
    channelPartnerAccessLevel: string | null;
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
    organizationName: string;
    system_state: string;
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
    fullName: string;
    roles: string[];
    title: string;
    created: string;
    groupRoles: GroupRole[];
}

export interface GroupRole {
    name: string;
    groupId: string;
    roles: string[];
    rolesIds: string[];
}

export interface CreateOrganizationUser {
    email: string;
    roleId: string;
    title?: string;
}

export type UpdateOrganizationUser = CreateOrganizationUser;

/* System Services */
export interface ServiceQuantity {
    quantity: number;
    used: number;
}

/** Annoying response type with extra layer */
export interface ServiceQuantitiesResp {
    services: ServiceQuantities;
}
export type ServiceQuantities = Record<string, ServiceQuantity>;
export interface SystemService {
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
export interface GroupItem extends SystemItem {
    id: string;
    roles: string[];
    name: string;
    parentId: string;
    children: GroupItem[];
    systemCount: number;
}

export interface SystemItem {
    name: string | undefined;
    systemId: string;
    type: OrgCardItem;
    system2faEnabled: boolean;
}

export enum OrgCardItem {
    SYSTEM = 'system',
    GROUP = 'group',
    ORG = 'org',
}

export interface GetGroupItem extends GroupItem {
    systems: string[];
    cloudSystems: CloudSystem[];
}

export interface CreateGroup {
    name: string;
    parentId: string;
    organizationId: string;
}

export interface PatchGroup {
    name?: string;
    parentId?: string | null;
}

/* Group Users */
export interface GroupUser {
    fullName: string;
    email: string;
    roles: string[];
    rolesIds: string[];
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

export interface Security {
    checkPeriodS: number;
    lastCheck: string;
    status: {
        analytics: string[];
        cloud_storage: string[];
        local_recording: string[];
    };
    tmpExpirationDate: string;
}

export interface SassReport {
    channelPartner: Pick<ChannelPartner, 'id' | 'name' | 'supportInformation'>;
    cloudSystemId: string;
    organization: {
        id: string;
        name: string;
    };
    security: Security;
    services: ServiceQuantities;
    signature: string;
    state: string;
}
