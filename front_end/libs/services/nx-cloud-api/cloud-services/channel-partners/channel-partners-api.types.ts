// e.g. https://nxlicensed.test.hdw.mx/nxlicensed/api/v2/partners/organizations/5/users/

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

export enum ConnectionStatus {
    NotConnected = 'not-connected',
    Connected = 'connected',
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
    effectiveState: State;
    parentChannelPartner: string;
    monthlyAdditionalServiceLimit: number | null;
    attributes: Record<string, unknown>;
    supportInformation: SupportInformationServer;
    created: string;
    ownPermissions: string[];
    ownRoles: string[];
    ownRolesIds: string[];
    name: string;
    created_ts: string;
    path: string[];
    users: number[];
    organizationCount: number;
    partnerCount: number;
    channelPartnerAccessLevel: null | string;
}

export enum PartnerRoles {
    field_access_cp_admin = 'field_access_cp_admin',
    field_access_cp_manager = 'field_access_cp_manager',
    field_access_cp_accountant = 'field_access_cp_accountant',
    field_access_org_admin = 'field_access_org_admin',
    field_access_org_power_user = 'field_access_org_power_user',
    field_access_org_other = 'field_access_org_other',
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
    value: string;
}

export type InfoDataServer = InfoRowServer | CustomRowServer;

// How info is presented in server response
export interface SupportInformationServer {
    sites: InfoRowServer[];
    phones: InfoRowServer[];
    emails: InfoRowServer[];
    custom: CustomRowServer[];
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
    supportInformation: SupportInformationServer;
}>;

export interface ChannelPartnersStructure {
    channelPartners: PartnerStructure[];
    organizations: OrganizationStructure[];
}

export interface PartnerStructure {
    id: string;
    name: string;
    subChannels: PartnerStructure[];
    organizations: OrganizationStructure[];
}

export interface OrganizationStructure {
    id: string;
    name: string;
}

/* Organizations */
export interface Organization {
    attributes: Record<string, unknown>;
    channelPartner: string;
    channelPartnerAccessLevel: null | string;
    created: string;
    currentServices: Record<string, unknown>;
    effectiveState: string;
    id: string;
    name: string;
    ownPermissions: string[];
    ownRoles: string[];
    ownRolesIds: string[];
    state: State;
    systemCount: number;
    users: number[];
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
    path: string[];
}>;

/* Systems */
export interface CloudSystem {
    activated: boolean;
    created: string;
    id: number;
    groupId: string | null;
    /** API sometimes forgets the system name, don't use for now
     *
     * https://networkoptix.atlassian.net/browse/CLOUD-13056
     */
    name: never;
    organization: string;
    services: ServiceQuantities;
    state: string;
    systemId: string;
    organizationName: string;
    system_state: string;
    effectiveState: string;
}

export type CloudSystemLight = Omit<CloudSystem, 'services' | 'activated'>;

export type PaginatedCloudSystemList = Page<CloudSystem>;

export type PaginatedCloudSystemLightList = Page<CloudSystemLight>;

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
    rolesIds: OrgRoleIds[];
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
/** `/organizations/{orgId}/groups_structure/` */
export interface GroupStructureItem {
    id: string;
    roles: string[];
    name: string;
    parentId: string | null;
    children: GroupStructureItem[];
    systemCount: number;
}

/** `/groups/{groupId}/` */
export interface Group {
    id: string;
    name: string;
    /** @deprecated Use `cloudSystems` property instead */
    systems: string[];
    cloudSystems: CloudSystemLight[];
    /** Only direct desendants */
    children: { id: string; name: string }[];
    parentId: string | null;
    organizationId: string;
    /** Bottom to top: [...parentGroupIds, orgId, partnerId]  */
    path: string[];
    systemCount: number;
}

// TODO: Move these to groups.types
export interface GroupItem extends Omit<GroupStructureItem, 'roles' | 'children'> {
    children: GroupItem[];
}
export interface SystemItem {
    systemId: string;
    organizationId: string;
    groupId: string | null;
    name: string;
    system2faEnabled: boolean;
    effectiveState: string;
    stateOfHealth: string;
}

export interface CreateGroup {
    name: string;
    parentId: string | null;
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

/* Reports */
export enum EntityType {
    channelPartner = 'channel_partner',
    organization = 'organization',
}

export enum ServiceType {
    regular = 'regular',
    trial = 'trial',
    demo = 'demo',
}

// Reports - Service usage
interface BaseUsageReportEntry {
    service_id: string;
    service_name: string;
    channels: number;
    expirations: string[];
    monthly_rate: number;
    daily_rate: number;
    sub_type: ServiceType;
}

export interface PartnerUsageReportEntry extends BaseUsageReportEntry {
    used_by_organizations: number;
    used_by_channel_partners: number;
}

export interface OrgUsageReportEntry extends BaseUsageReportEntry {
    used_by: number;
}

export type ReportExportFormat = 'xlsx' | 'csv';

export type ReportStatus = 'success' | 'failed' | 'pending';

export interface ExportResponse {
    id: string;
    status: ReportStatus;
    downloadUrl?: string;
}

// Reports - Regular service details
export interface EntityRegularServiceEntry {
    id: string;
    type: string;
    name: string;
    channels: number;
    monthly_rate: number;
    daily_rate: number;
    changes_count: number;
    last_changed: string;
}

export interface PartnerRegularServiceReportResponse {
    sub_entities: EntityRegularServiceEntry[];
}

export interface SystemRegularServiceEntry {
    system_id: string;
    system_name: string;
    channels: number;
    monthly_rate: number;
    daily_rate: number;
    changes_count: number;
    last_changed: string;
}

export interface OrgRegularServiceReportResponse {
    systems: SystemRegularServiceEntry[];
}

// Reports - Regular service details - Detail table dialog
export interface RegularServiceDetailDialogEntry {
    date: string;
    channels: number;
    monthly_rate: number;
    daily_rate: number;
    transactions: number;
}

export type RegularServiceDetailDialogResponse = RegularServiceDetailDialogEntry[];

// Reports - Expiring service details
export interface SystemExpiringServiceEntry {
    system_id: string;
    system_name: string;
    groups_path: { id: string; name: string }[];
    channels: number;
    expiration_date: string;
}

export interface OrgExpiringServiceReportResponse {
    systems: SystemExpiringServiceEntry[];
}

export interface EntityExpiringServiceEntry {
    id: string;
    type: EntityType;
    name: string;
    channels: number;
    expirations: string[];
}

export interface PartnerExpiringServiceReportResponse {
    sub_entities: EntityExpiringServiceEntry[];
}

// Reports - Expiring service details - Detail table dialog
export interface ExpiringServiceDetailDialogEntry {
    channels: number;
    expiration_date: string;
}

export type ExpiringServiceDetailDialogResponse = ExpiringServiceDetailDialogEntry[];

// Reports - Service changes
interface PartnerServiceChangeEntry {
    serviceId: string;
    organizationId: string;
    channelPartnerId: string;
    changeQuantity: number;
    date: string;
}

export interface PartnerServiceChangesResponse {
    count: number;
    results: PartnerServiceChangeEntry[];
}

interface OrgServiceChangeEntry {
    service: {
        id: string;
        displayName: string;
    };
    changeQuantity: number;
    system: string;
    date: string;
}

export interface OrgServiceChangesResponse {
    count: number;
    results: OrgServiceChangeEntry[];
}

export interface Service {
    id: string;
    displayName: string;
}

export type OwnedService = Service;

export interface AvailableService {
    service: Service;
}

export type HasMoreNotifierCallback = (hasMore: boolean, remaining: number) => void;

export type HasMoreNotifier = (notifier: HasMoreNotifierCallback) => void;

export type PageUpdater = {
    registerHasMoreNotifier: HasMoreNotifier;
    loadMore: () => void;
};

export type WithPageUpdater<T> = T & {
    withPageUpdater: () => T & PageUpdater;
    withQueryParams: (params: Record<string, string>) => WithPageUpdater<T>;
};
