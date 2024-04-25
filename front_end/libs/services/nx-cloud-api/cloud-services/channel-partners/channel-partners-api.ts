import { HttpClient } from '@angular/common/http';
import { Observable, OperatorFunction, map } from 'rxjs';

import { slashJoin } from '@utils/general';

import { WithFreshSession } from '../../nx-cloud-api.types';
import {
    BaseCloudServiceAPI,
    CreateApiFactory,
    implementsCloudServiceApi,
} from '../base-cloud-service-api';

import {
    ChannelPartner,
    ChannelPartnerRole,
    ChannelPartnerUser,
    CreateChannelPartnerUser,
    CreateChannelPartner,
    CreateOrganization,
    CreateOrganizationUser,
    Organization,
    OrganizationRole,
    OrganizationUser,
    UpdateChannelPartner,
    UpdateChannelPartnerUser,
    UpdateOrganization,
    UpdateOrganizationUser,
    CloudSystem,
    PaginatedChannelPartnerList,
    PaginatedOrganizationList,
    PaginatedCloudSystemList,
    Page,
    SystemService,
    ServiceQuantitiesResp,
    CreateGroup,
    PatchGroup,
    Group,
    GroupUser,
    UpdateGroupUser,
    GroupUserCanAccess,
    SassReport,
    ServiceQuantities,
    GroupStructureItem,
    PartnerServiceChangesResponse,
    OrgServiceChangesResponse,
    AvailableService,
    OwnedService,
    PartnerUsageReportEntry,
    OrgUsageReportEntry,
    PartnerServiceReportResponse,
    OrgServiceReportResponse,
    DetailTableResponse,
    CloudSystemLight,
    PaginatedCloudSystemLightList,
} from './channel-partners-api.types';

// function updateCachedLicenseServer(targetProperty: string) {
//     return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
//         const originalMethod = descriptor.value;
//         descriptor.value = function (...args) {
//             const systemId = args[0]?.[targetProperty];
//             return originalMethod.apply(this, args).pipe(tap(() => systemId && this.cacheLicenseServer(systemId)));
//         };
//     };
// }

function getResults<T>(): OperatorFunction<Page<T>, T[]> {
    return map(page => page.results);
}

const urlBases = {
    CHANNEL_PARTNERS: 'channel_partners',
    ORGANIZATIONS: 'organizations',
    GROUPS: 'groups',
    CLOUD_SYSTEMS: 'cloud_systems',
};

@implementsCloudServiceApi
export class ChannelPartnersApi extends BaseCloudServiceAPI {
    /**
     * Api base for supported license server version. Future versions of license server can be supported by extending LicenseServerAPI.
     */
    static readonly API_BASE = '/partners/api/v2';

    static INSTANCES: Record<string, ChannelPartnersApi> = {};

    /**
     * Creates a factory for instancing a LicenseServerApi pointing to a specific license server instance.
     *
     * @param config IConfig
     * @param http HttpClient
     * @param withFreshSession WithFreshSession
     * @returns  (serverUrl?: string, cloudHost?: string) => LicenseServerAPI
     */
    static createApiFactory: CreateApiFactory<ChannelPartnersApi> =
        (http: HttpClient, withFreshSession: WithFreshSession) =>
        (serverUrl: string, cloudHost: () => string) => {
            ChannelPartnersApi.INSTANCES[serverUrl] ||= new ChannelPartnersApi(
                serverUrl,
                cloudHost,
                http,
                withFreshSession,
            );
            return ChannelPartnersApi.INSTANCES[serverUrl];
        };

    constructor(
        serverUrl: string,
        cloudHost: () => string,
        http: HttpClient,
        withFreshSession: WithFreshSession,
    ) {
        super(serverUrl, ChannelPartnersApi.API_BASE, cloudHost, http, withFreshSession);
    }

    private makeUrl(base: string, parts: (string | number)[], trailing: boolean = true): string {
        return slashJoin([base, ...parts], { leading: true, trailing });
    }

    /* Channel Partners */
    public getChannelPartners = (): Observable<ChannelPartner[]> => {
        return this.get<PaginatedChannelPartnerList>('/channel_partners/').pipe(getResults());
    };

    public createChannelPartner = (body: CreateChannelPartner): Observable<ChannelPartner> => {
        return this.post('/channel_partners/', { body });
    };

    getSubChannelPartners = (parentPartnerId: string): Observable<ChannelPartner[]> => {
        return this.get<PaginatedChannelPartnerList>(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [parentPartnerId, 'sub_channel_partners']),
        ).pipe(getResults());
    };

    getChannelPartner = (partnerId: string): Observable<ChannelPartner> => {
        return this.get(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId]));
    };

    updateChannelPartner = (
        partnerId: string,
        body: UpdateChannelPartner,
    ): Observable<ChannelPartner> => {
        return this.patch(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId]), { body });
    };

    removeChannelPartner = (partnerId: string): Observable<void> => {
        return this.delete(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId]));
    };

    /* Channel Partner Users */
    getChannelPartnerRoles = (): Observable<ChannelPartnerRole[]> => {
        return this.get('/channel_partner_roles');
    };

    getChannelPartnerUsers = (partnerId: string): Observable<ChannelPartnerUser[]> => {
        return this.get(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'users']));
    };

    createChannelPartnerUser = (
        partnerId: string,
        body: CreateChannelPartnerUser,
    ): Observable<ChannelPartnerUser> => {
        return this.post(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'users']), { body });
    };

    getSelfChannelPartnerUser = (partnerId: string): Observable<ChannelPartnerUser> => {
        return this.get(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'users', 'self']));
    };

    // Updates role
    updateChannelPartnerUser = (
        partnerId: string,
        body: UpdateChannelPartnerUser,
    ): Observable<ChannelPartnerUser> => {
        return this.post(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'users']), { body });
    };

    getChannelPartnerUser = (partnerId: string, email: string): Observable<ChannelPartnerUser> => {
        return this.get(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'users', email]));
    };

    deleteChannelPartnerUser = (partnerId: string, email: string): Observable<void> => {
        return this.delete(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'users', email]));
    };

    bulkDeleteChannelPartnerUsers = (
        partnerId: string,
        users: string[],
    ): Observable<{ emails: string[] }> => {
        return this.post(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'users', 'bulk_delete']),
            { body: users },
        );
    };

    /* Channel Partner Reports */
    getPartnerServiceUsage = (partnerId: string): Observable<PartnerUsageReportEntry[]> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'reports', 'usage_report']),
        );
    };

    getPartnerServiceReport = (
        partnerId: string,
        serviceId: string,
    ): Observable<PartnerServiceReportResponse> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [
                partnerId,
                'reports',
                serviceId,
                'regular_service_report',
            ]),
        );
    };

    getPartnerDetailTable = (
        partnerId: string,
        serviceId: string,
    ): Observable<DetailTableResponse> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [
                partnerId,
                'reports',
                serviceId,
                'regular_detail_table',
            ]),
        );
    };

    getPartnerServiceChanges = (
        partnerId: string,
        startTs: string,
        endTs: string,
    ): Observable<PartnerServiceChangesResponse> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'service_changes_history']),
            {
                params: {
                    startTs,
                    endTs,
                },
            },
        );
    };

    /* Organizations */
    public getPartnerOrganizations = (partnerId: string): Observable<Organization[]> => {
        return this.get<PaginatedOrganizationList>(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'organizations']),
        ).pipe(getResults());
    };

    getOrganizations = (includeChildOrgs = false): Observable<Organization[]> => {
        return this.get<PaginatedOrganizationList>('/organizations/', {
            params: { includeChildOrgs },
        }).pipe(getResults());
    };

    createOrganization = (body: CreateOrganization): Observable<Organization> => {
        return this.post('/organizations/', { body });
    };

    getOrganization = (orgId: string): Observable<Organization> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId]));
    };

    updateOrganization = (orgId: string, body: UpdateOrganization): Observable<Organization> => {
        return this.patch(this.makeUrl(urlBases.ORGANIZATIONS, [orgId]), { body });
    };

    removeOrganization = (orgId: string): Observable<void> => {
        return this.delete(this.makeUrl(urlBases.ORGANIZATIONS, [orgId]));
    };

    /* Organization Users */
    getOrganizationRoles = (): Observable<OrganizationRole[]> => {
        return this.get('/organization_roles');
    };

    getOrganizationUsers = (orgId: string): Observable<OrganizationUser[]> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'users']));
    };

    createOrganizationUser = (
        orgId: string,
        body: CreateOrganizationUser,
    ): Observable<OrganizationUser> => {
        return this.post(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'users']), { body });
    };

    updateOrganizationUser = (
        orgId: string,
        body: UpdateOrganizationUser,
    ): Observable<OrganizationUser> => {
        return this.post(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'users']), { body });
    };

    getOrganizationUser = (orgId: string, email: string): Observable<OrganizationUser> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'users', email]));
    };

    deleteOrganizationUser = (orgId: string, email: string): Observable<void> => {
        return this.delete(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'users', email]));
    };

    deleteBulkOrganizationUsers = (
        orgId: string,
        emails: string[],
    ): Observable<OrganizationUser[]> => {
        return this.post(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'users', 'bulk_delete']), {
            body: emails,
        });
    };

    deleteBulkUserGroups = (orgId: string, email: string, groupIds: string[]): Observable<null> =>
        this.post(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'users', email, 'remove_groups']), {
            body: groupIds,
        });

    /* Organization Reports */
    getOrganizationServiceUsage = (orgId: string): Observable<OrgUsageReportEntry[]> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'reports', 'usage_report']));
    };

    getOrganizationServiceReport = (
        orgId: string,
        serviceId: string,
    ): Observable<OrgServiceReportResponse> => {
        return this.get(
            this.makeUrl(urlBases.ORGANIZATIONS, [
                orgId,
                'reports',
                serviceId,
                'regular_service_report',
            ]),
        );
    };

    getOrganizationDetailTable = (
        orgId: string,
        serviceId: string,
    ): Observable<DetailTableResponse> => {
        return this.get(
            this.makeUrl(urlBases.ORGANIZATIONS, [
                orgId,
                'reports',
                serviceId,
                'regular_detail_table',
            ]),
        );
    };

    getOrgSystemDetailTable = (
        orgId: string,
        systemId: string,
        serviceId: string,
    ): Observable<DetailTableResponse> => {
        return this.get(
            this.makeUrl(urlBases.ORGANIZATIONS, [
                orgId,
                'reports',
                serviceId,
                'cloud_system',
                systemId,
                'regular_detail_table',
            ]),
        );
    };

    getOrganizationServiceChanges = (
        orgId: string,
        startTs: string,
        endTs: string,
    ): Observable<OrgServiceChangesResponse> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'service_changes_history']), {
            params: {
                startTs,
                endTs,
            },
        });
    };

    /* Service Management */
    getChannelPartnerOwnedServices = (partnerId: string): Observable<OwnedService[]> =>
        this.get(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'services', 'owned']));

    getOrganizationServices = (orgId: string): Observable<AvailableService[]> =>
        this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'services']));

    /* Systems */
    getUserSystems = (orgId: string, rootOnly = false): Observable<CloudSystemLight[]> => {
        return this.get<PaginatedCloudSystemLightList>(
            this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'cloud_systems', 'user_systems']),
            { params: { rootOnly } },
        ).pipe(getResults());
    };

    transferSystemToOrg = (orgId: string, systemId: string): Observable<CloudSystem> => {
        return this.post(`/cloud_systems/${systemId}/transfer_offer/`, {
            body: { organizationId: orgId },
        });
    };

    getOrgSystems = (orgId: string, rootOnly = false): Observable<CloudSystem[]> => {
        return this.get<PaginatedCloudSystemList>(
            this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'cloud_systems']),
            { params: { rootOnly } },
        ).pipe(getResults());
    };

    disconnectSystem = (systemId: string): Observable<void> =>
        this.delete(`/cloud_systems/${systemId}/`);

    /* System Services */
    getSystem = (id: string): Observable<CloudSystem> => {
        return this.get(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id]));
    };

    patchSystem = (
        id: string,
        body: { state?: string; groupId: string | null },
    ): Observable<CloudSystem> => {
        return this.patch(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id]), { body });
    };

    getSystemSassReport = (id: string): Observable<SassReport> => {
        return this.get(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id, 'saas_report']));
    };

    getSystemServiceQuantities = (id: string): Observable<ServiceQuantities> => {
        return this.get<ServiceQuantitiesResp>(
            this.makeUrl(urlBases.CLOUD_SYSTEMS, [id, 'service_quantity']),
        ).pipe(map(({ services }) => services));
    };
    getSystemServices = (id: string): Observable<SystemService[]> => {
        return this.get(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id, 'services']));
    };

    updateSystemServiceQuantity = (
        id: string,
        newQuantities: Record<string, { quantity: number }>,
    ): Observable<ServiceQuantitiesResp> => {
        return this.patch(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id, 'service_quantity']), {
            body: { services: newQuantities },
        });
    };

    updateSystemGroup = (
        id: string,
        body: { groupId: string | number | null },
    ): Observable<CloudSystem> => {
        const groupId = body.groupId ? String(body.groupId) : null;
        return this.patch(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id]), { body: { groupId } });
    };

    /* Internal */

    /* Groups */
    getGroupsStructure = (orgId: string): Observable<GroupStructureItem[]> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'groups_structure']));
    };

    getGroup = (groupId: string): Observable<Group> => {
        return this.get(this.makeUrl(urlBases.GROUPS, [groupId]));
    };

    createGroup = (body: CreateGroup): Observable<Group> => {
        return this.post('/groups/', { body });
    };

    deleteGroup = (groupId: string): Observable<Group> => {
        return this.delete(this.makeUrl(urlBases.GROUPS, [groupId]));
    };

    patchGroup = (groupId: string, body: PatchGroup): Observable<Group> => {
        return this.patch(this.makeUrl(urlBases.GROUPS, [groupId]), { body });
    };

    /* Group Users */
    getGroupUser = (groupId: string, email: string): Observable<GroupUserCanAccess> => {
        return this.get(this.makeUrl(urlBases.GROUPS, [groupId, 'users', email]));
    };

    getGroupUsers = (groupId: string): Observable<GroupUser[]> => {
        return this.get(this.makeUrl(urlBases.GROUPS, [groupId, 'users']));
    };

    updateGroupUser = (groupId: string, body: UpdateGroupUser): Observable<GroupUser> => {
        return this.post(this.makeUrl(urlBases.GROUPS, [groupId, 'users']), { body });
    };

    deleteBulkGroupUsers = (groupId: string, emails: string[]): Observable<GroupUser[]> => {
        return this.post(this.makeUrl(urlBases.GROUPS, [groupId, 'users', 'bulk_delete']), {
            body: emails,
        });
    };

    getGroupUsersWithAccess = (groupId: string): Observable<GroupUserCanAccess[]> => {
        return this.get(this.makeUrl(urlBases.GROUPS, [groupId, 'users', 'can_access']));
    };
}
