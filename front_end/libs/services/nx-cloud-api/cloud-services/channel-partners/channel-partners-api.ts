/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, OperatorFunction, concatMap, map, scan } from 'rxjs';

import { slashJoin } from '@utils/general';
import { memoizeAsyncMedium } from '@utils/memoize';

import { WithFreshSession } from '../../nx-cloud-api.types';
import {
    BaseCloudServiceAPI,
    CreateApiFactory,
    implementsCloudServiceApi,
} from '../base-cloud-service-api';
import { BaseRequestOptions } from '../base-cloud-service-api.types';

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
    PaginatedCloudSystemLightList,
    ChannelPartnersStructure,
    PageUpdater,
    WithPageUpdater,
    HasMoreNotifierCallback,
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

const withDefaultSort = ({
    params = {},
    ...options
}: BaseRequestOptions = {}): BaseRequestOptions => ({
    ...options,
    params: { ...params, ordering: 'ordering' in params ? params.ordering : 'name' },
});

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

    @memoizeAsyncMedium
    private memoizedGetPaginated(endpoint: string, options?: BaseRequestOptions | undefined) {
        return this.getPaginated(endpoint, options);
    }

    public getPaginated = <T extends Page<unknown>>(
        endpoint: string,
        options?: BaseRequestOptions | undefined,
    ): T extends Page<infer R> ? WithPageUpdater<Observable<R[]>> : never =>
        new Proxy(this.get<T>(endpoint, withDefaultSort(options)).pipe(getResults()), {
            get: (target, prop) => {
                if (prop === 'withQueryParams') {
                    return (query: Record<string, string>) => {
                        return this.memoizedGetPaginated(
                            endpoint,
                            withDefaultSort({ params: query }),
                        );
                    };
                }

                if (prop === 'withPageUpdater') {
                    return () => {
                        let nextPage: string | null = null;
                        let total = 0;
                        let remaining = 0;
                        const hasMoreNotifiers = new Set<HasMoreNotifierCallback>();
                        const notifyHasMore = (hasMore: boolean, remaining: number) =>
                            hasMoreNotifiers.forEach(notifier => notifier(hasMore, remaining));
                        const optionsWithSort = withDefaultSort(options);

                        const endpoint$ = new BehaviorSubject<string>(endpoint);

                        return new Proxy(
                            endpoint$.pipe(
                                concatMap(url => (url ? this.get<T>(url, optionsWithSort) : EMPTY)),
                                map(page => {
                                    nextPage = page.next?.split(this.apiBase)[1] ?? null;
                                    total += page.results.length;
                                    remaining = page.count - total;
                                    notifyHasMore(!!nextPage, remaining);
                                    return page.results;
                                }),
                                scan((acc, results) => acc.concat(results), [] as unknown[]),
                            ),
                            {
                                get: (target, prop) => {
                                    if (prop === 'registerHasMoreNotifier') {
                                        return (notifier: HasMoreNotifierCallback): void => {
                                            hasMoreNotifiers.add(notifier);
                                        };
                                    }
                                    if (prop === 'loadMore') {
                                        return () => {
                                            if (
                                                optionsWithSort.params &&
                                                'ordering' in optionsWithSort.params
                                            ) {
                                                delete optionsWithSort.params.ordering;
                                            }
                                            if (nextPage) {
                                                notifyHasMore(false, remaining);
                                                endpoint$.next(nextPage);
                                            }
                                        };
                                    }
                                    return Reflect.get(target, prop);
                                },
                            },
                        ) as T extends Page<infer R> ? Observable<R[]> & PageUpdater : never;
                    };
                }
                return target[prop as keyof typeof target];
            },
        }) as T extends Page<infer R> ? WithPageUpdater<Observable<R[]>> : never;

    /* Channel Partners */
    public getChannelPartners = () => {
        return this.getPaginated<PaginatedChannelPartnerList>('/channel_partners/');
    };

    public createChannelPartner = (body: CreateChannelPartner): Observable<ChannelPartner> => {
        return this.post('/channel_partners/', { body });
    };

    getSubChannelPartners = (parentPartnerId: string) => {
        return this.getPaginated<PaginatedChannelPartnerList>(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [parentPartnerId, 'sub_channel_partners']),
        );
    };

    @memoizeAsyncMedium
    private _getChannelPartner(partnerId: string): Observable<ChannelPartner> {
        return this.get(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId]));
    }
    getChannelPartner = (partnerId: string): Observable<ChannelPartner> => {
        return this._getChannelPartner(partnerId);
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

    getChannelStructure = (): Observable<ChannelPartnersStructure> => {
        return this.get<ChannelPartnersStructure>(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, ['channel_structure']),
        );
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
    getPartnerServiceUsage = (
        partnerId: string,
        periodStartDate: string,
    ): Observable<PartnerUsageReportEntry[]> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'reports', 'usage_report']),
            { params: { periodStartDate } },
        );
    };

    getPartnerServiceReport = (
        partnerId: string,
        serviceId: string,
        periodStartDate: string,
    ): Observable<PartnerServiceReportResponse> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [
                partnerId,
                'reports',
                serviceId,
                'regular_service_report',
            ]),
            { params: { periodStartDate } },
        );
    };

    getPartnerDetailTable = (
        partnerId: string,
        serviceId: string,
        periodStartDate: string,
    ): Observable<DetailTableResponse> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [
                partnerId,
                'reports',
                serviceId,
                'regular_detail_table',
            ]),
            { params: { periodStartDate } },
        );
    };

    getPartnerServiceChanges = (
        partnerId: string,
        startTs: string,
        endTs: string,
        page: number,
        pageSize: number,
        ordering: string,
    ): Observable<PartnerServiceChangesResponse> => {
        return this.get(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'service_changes_history']),
            {
                params: {
                    startTs,
                    endTs,
                    page,
                    page_size: pageSize,
                    ordering,
                },
            },
        );
    };

    /* Organizations */
    public getPartnerOrganizations = (partnerId: string) => {
        return this.getPaginated<PaginatedOrganizationList>(
            this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'organizations']),
        );
    };

    getOrganizations = (includeChildOrgs = false) => {
        return this.getPaginated<PaginatedOrganizationList>('/organizations/', {
            params: { includeChildOrgs },
        });
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
    getOrganizationServiceUsage = (
        orgId: string,
        periodStartDate: string,
    ): Observable<OrgUsageReportEntry[]> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'reports', 'usage_report']), {
            params: { periodStartDate },
        });
    };

    getOrganizationServiceReport = (
        orgId: string,
        serviceId: string,
        periodStartDate: string,
    ): Observable<OrgServiceReportResponse> => {
        return this.get(
            this.makeUrl(urlBases.ORGANIZATIONS, [
                orgId,
                'reports',
                serviceId,
                'regular_service_report',
            ]),
            { params: { periodStartDate } },
        );
    };

    getOrganizationDetailTable = (
        orgId: string,
        serviceId: string,
        periodStartDate: string,
    ): Observable<DetailTableResponse> => {
        return this.get(
            this.makeUrl(urlBases.ORGANIZATIONS, [
                orgId,
                'reports',
                serviceId,
                'regular_detail_table',
            ]),
            { params: { periodStartDate } },
        );
    };

    getOrgSystemDetailTable = (
        orgId: string,
        systemId: string,
        serviceId: string,
        periodStartDate: string,
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
            { params: { periodStartDate } },
        );
    };

    getOrganizationServiceChanges = (
        orgId: string,
        startTs: string,
        endTs: string,
        page: number,
        pageSize: number,
        ordering: string,
    ): Observable<OrgServiceChangesResponse> => {
        return this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'service_changes_history']), {
            params: {
                startTs,
                endTs,
                page,
                page_size: pageSize,
                ordering,
            },
        });
    };

    /* Service Management */
    getChannelPartnerOwnedServices = (partnerId: string): Observable<OwnedService[]> =>
        this.get(this.makeUrl(urlBases.CHANNEL_PARTNERS, [partnerId, 'services', 'owned']));

    getOrganizationServices = (orgId: string): Observable<AvailableService[]> =>
        this.get(this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'services']));

    /* Systems */
    getUserSystems = (orgId: string, rootOnly = false) => {
        return this.getPaginated<PaginatedCloudSystemLightList>(
            this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'cloud_systems', 'user_systems']),
            { params: { rootOnly } },
        );
    };

    transferSystemToOrg = (orgId: string, systemId: string): Observable<CloudSystem> => {
        return this.post(`/cloud_systems/${systemId}/transfer_offer/`, {
            body: { organizationId: orgId },
        });
    };

    getOrgSystems = (orgId: string, rootOnly = false) => {
        return this.getPaginated<PaginatedCloudSystemList>(
            this.makeUrl(urlBases.ORGANIZATIONS, [orgId, 'cloud_systems']),
            { params: { rootOnly } },
        );
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
