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
    ServiceData,
    SystemServices,
    GroupItem,
    CreateGroup,
    PatchGroup,
    GetGroupItem,
    GroupUser,
    UpdateGroupUser,
    GroupUserCanAccess,
    SassReport,
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

    /* Systems */
    getUserSystems = (): Observable<CloudSystem[]> => {
        return this.get<PaginatedCloudSystemList>('/cloud_systems/').pipe(getResults());
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

    getSystemServiceQuantity = (id: string): Observable<SystemServices> => {
        return this.get(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id, 'service_quantity']));
    };
    getSystemServices = (id: string): Observable<ServiceData[]> => {
        return this.get(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id, 'services']));
    };

    updateSystemServiceQuantity = (
        id: string,
        data: SystemServices,
    ): Observable<SystemServices> => {
        return this.patch(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id, 'service_quantity']), {
            body: data,
        });
    };

    updateSystemGroup = (id: string, body: { groupId: string | null }): Observable<CloudSystem> => {
        return this.patch(this.makeUrl(urlBases.CLOUD_SYSTEMS, [id]), { body });
    };

    /* Internal */

    /* Groups */
    getOrgGroups = (orgId: string): Observable<GroupItem[]> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'groups_structure']));
    };

    getGroup = (groupId: string): Observable<GetGroupItem> => {
        return this.get(this.makeUrl(urlBases.GROUPS, [groupId]));
    };

    createGroup = (body: CreateGroup): Observable<GroupItem> => {
        return this.post('/groups/', { body });
    };

    deleteGroup = (groupId: string): Observable<GroupItem> => {
        return this.delete(this.makeUrl(urlBases.GROUPS, [groupId]));
    };

    patchGroup = (groupId: string, body: PatchGroup): Observable<GroupItem> => {
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
