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
    BindSystemToOrganization,
    PaginatedChannelPartnerList,
    PaginatedOrganizationList,
    PaginatedCloudSystemList,
    Page,
    ServiceData,
    SystemServices,
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

@implementsCloudServiceApi
export class ChannelPartnersApi extends BaseCloudServiceAPI {
    /**
     * Api base for supported license server version. Future versions of license server can be supported by extending LicenseServerAPI.
     */
    // static readonly API_BASE = '/nxlicensed/api/v2/partners';
    static readonly API_BASE = '/api/v2/partners';

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

    private cpUrl(parts: (string | number)[], trailing: boolean = true): string {
        return slashJoin(['channel_partners', ...parts], { leading: true, trailing });
    }

    private orgUrl(parts: (string | number)[], trailing: boolean = true): string {
        return slashJoin(['organizations', ...parts], { leading: true, trailing });
    }

    private cloudSystemUrl(parts: (string | number)[], trailing: boolean = true): string {
        return slashJoin(['cloud_systems', ...parts], { leading: true, trailing });
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
            this.cpUrl([parentPartnerId, 'sub_channel_partners']),
        ).pipe(getResults());
    };

    getChannelPartner = (partnerId: string): Observable<ChannelPartner> => {
        return this.get(this.cpUrl([partnerId]));
    };

    updateChannelPartner = (
        partnerId: string,
        body: UpdateChannelPartner,
    ): Observable<ChannelPartner> => {
        return this.patch(this.cpUrl([partnerId]), { body });
    };

    removeChannelPartner = (partnerId: string): Observable<void> => {
        return this.delete(this.cpUrl([partnerId]));
    };

    /* Channel Partner Users */
    getChannelPartnerRoles = (): Observable<ChannelPartnerRole[]> => {
        return this.get('/channel_partner_roles');
    };

    getChannelPartnerUsers = (partnerId: string): Observable<ChannelPartnerUser[]> => {
        return this.get(this.cpUrl([partnerId, 'users']));
    };

    createChannelPartnerUser = (
        partnerId: string,
        body: CreateChannelPartnerUser,
    ): Observable<ChannelPartnerUser> => {
        return this.post(this.cpUrl([partnerId, 'users']), { body });
    };

    // Updates role
    updateChannelPartnerUser = (
        partnerId: string,
        body: UpdateChannelPartnerUser,
    ): Observable<ChannelPartnerUser> => {
        return this.post(this.cpUrl([partnerId, 'users']), { body });
    };

    getChannelPartnerUser = (partnerId: string, email: string): Observable<ChannelPartnerUser> => {
        return this.get(this.cpUrl([partnerId, 'users', email]));
    };

    deleteChannelPartnerUser = (partnerId: string, email: string): Observable<void> => {
        return this.delete(this.cpUrl([partnerId, 'users', email]));
    };

    /* Organizations */
    public getPartnerOrganizations = (partnerId: string): Observable<Organization[]> => {
        return this.get<PaginatedOrganizationList>(this.cpUrl([partnerId, 'organizations'])).pipe(
            getResults(),
        );
    };

    getOrganizations = (): Observable<Organization[]> => {
        return this.get<PaginatedOrganizationList>('/organizations/').pipe(getResults());
    };

    createOrganization = (body: CreateOrganization): Observable<Organization> => {
        return this.post('/organizations/', { body });
    };

    getOrganization = (orgId: string): Observable<Organization> => {
        return this.get(this.orgUrl([orgId]));
    };

    updateOrganization = (orgId: string, body: UpdateOrganization): Observable<Organization> => {
        return this.patch(this.orgUrl([orgId]), { body });
    };

    removeOrganization = (orgId: string): Observable<void> => {
        return this.delete(this.orgUrl([orgId]));
    };

    /* Organization Users */
    getOrganizationRoles = (): Observable<OrganizationRole[]> => {
        return this.get('/organization_roles');
    };

    getOrganizationUsers = (orgId: string): Observable<OrganizationUser[]> => {
        return this.get(this.orgUrl([orgId, 'users']));
    };

    createOrganizationUser = (
        orgId: string,
        body: CreateOrganizationUser,
    ): Observable<OrganizationUser> => {
        return this.post(this.orgUrl([orgId, 'users']), { body });
    };

    updateOrganizationUser = (
        orgId: string,
        body: UpdateOrganizationUser,
    ): Observable<OrganizationUser> => {
        return this.post(this.orgUrl([orgId, 'users']), { body });
    };

    getOrganizationUser = (orgId: string, email: string): Observable<OrganizationUser> => {
        return this.get(this.orgUrl([orgId, 'users', email]));
    };

    deleteOrganizationUser = (orgId: string, email: string): Observable<void> => {
        return this.delete(this.orgUrl([orgId, 'users', email]));
    };

    /* Systems */
    getUserSystems = (): Observable<CloudSystem[]> => {
        return this.get<PaginatedCloudSystemList>('/cloud_systems/').pipe(getResults());
    };

    bindSystemToOrg = (body: BindSystemToOrganization): Observable<CloudSystem> => {
        return this.post('/cloud_systems/', { body });
    };

    getOrgSystems = (orgId: string): Observable<CloudSystem[]> => {
        return this.get<PaginatedCloudSystemList>(this.orgUrl([orgId, 'cloud_systems'])).pipe(
            getResults(),
        );
    };

    /* System Services */
    getSystem(id: string): Observable<unknown> {
        return this.get(this.cloudSystemUrl([id]));
    }
    getSystemSassReport(id: string): Observable<unknown> {
        return this.get(this.cloudSystemUrl([id, 'saas_report']));
    }

    getSystemServiceQuantity(id: string): Observable<SystemServices> {
        return this.get(this.cloudSystemUrl([id, 'service_quantity']));
    }
    getSystemServices(id: string): Observable<ServiceData[]> {
        return this.get(this.cloudSystemUrl([id, 'services']));
    }

    updateSystemServiceQuantity(id: string, data: SystemServices): Observable<SystemServices> {
        return this.patch(this.cloudSystemUrl([id, 'service_quantity']), { body: data });
    }

    /* Internal */
}
