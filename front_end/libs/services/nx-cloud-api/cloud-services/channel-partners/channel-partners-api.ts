import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { slashJoin } from '@utils/general';

import { WithFreshSession } from '../../nx-cloud-api.types';
import {
    BaseCloudServiceAPI,
    CreateApiFactory,
    implementsCloudServiceApi,
} from '../base-cloud-service-api';

import type {
    ChannelPartner,
    ChannelPartnerRole,
    ChannelPartnerUser,
    CreateChannelPartnerUser,
    CreateChannelPartner,
    CreateOrganization,
    CreateOrganizationUser,
    Id,
    Organization,
    OrganizationRole,
    OrganizationUser,
    UpdateChannelPartner,
    UpdateChannelPartnerUser,
    UpdateOrganization,
    UpdateOrganizationUser,
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

@implementsCloudServiceApi
export class ChannelPartnersApi extends BaseCloudServiceAPI {
    /**
     * Api base for supported license server version. Future versions of license server can be supported by extending LicenseServerAPI.
     */
    static readonly API_BASE = '/nxlicensed/api/v2/partners';

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

    /* Channel Partners */
    public getChannelPartners = (): Observable<ChannelPartner[]> => {
        return this.get('/channel_partners/');
    };

    public createChannelPartner = (body: CreateChannelPartner): Observable<ChannelPartner> => {
        return this.post('/channel_partners/', { body });
    };

    getSubChannelPartners = (parentPartnerId: Id): Observable<ChannelPartner[]> => {
        return this.get(this.cpUrl([parentPartnerId, 'sub_channel_partners']));
    };

    getChannelPartner = (partnerId: Id): Observable<ChannelPartner> => {
        return this.get(this.cpUrl([partnerId]));
    };

    updateChannelPartner = (
        partnerId: Id,
        body: UpdateChannelPartner,
    ): Observable<ChannelPartner> => {
        return this.patch(this.cpUrl([partnerId]), { body });
    };

    removeChannelPartner = (partnerId: Id): Observable<void> => {
        return this.delete(this.cpUrl([partnerId]));
    };

    /* Channel Partner Users */
    getChannelPartnerRoles = (): Observable<ChannelPartnerRole[]> => {
        return this.get('/channel_partner_roles');
    };

    getChannelPartnerUsers = (partnerId: Id): Observable<ChannelPartnerUser[]> => {
        return this.get(this.cpUrl([partnerId, 'users']));
    };

    createChannelPartnerUser = (
        partnerId: Id,
        body: CreateChannelPartnerUser,
    ): Observable<ChannelPartnerUser> => {
        return this.post(this.cpUrl([partnerId, 'users']), { body });
    };

    // Updates role
    updateChannelPartnerUser = (
        partnerId: Id,
        body: UpdateChannelPartnerUser,
    ): Observable<ChannelPartnerUser> => {
        return this.post(this.cpUrl([partnerId, 'users']), { body });
    };

    getChannelPartnerUser = (partnerId: Id, userId: Id): Observable<ChannelPartnerUser> => {
        return this.get(this.cpUrl([partnerId, 'users', userId]));
    };

    deleteChannelPartnerUser = (partnerId: Id, userId: Id): Observable<void> => {
        return this.delete(this.cpUrl([partnerId, 'users', userId]));
    };

    /* Organizations */
    public getPartnerOrganizations = (partnerId: Id): Observable<Organization[]> => {
        return this.get(this.cpUrl([partnerId, 'organizations']));
    };

    getOrganizations = (): Observable<Organization[]> => {
        return this.get('/organizations/');
    };

    createOrganization = (body: CreateOrganization): Observable<Organization> => {
        return this.post('/organizations/', { body });
    };

    getOrganization = (orgId: Id): Observable<Organization> => {
        return this.get(this.orgUrl([orgId]));
    };

    updateOrganization = (orgId: Id, body: UpdateOrganization): Observable<Organization> => {
        return this.patch(this.orgUrl([orgId]), { body });
    };

    removeOrganization = (orgId: Id): Observable<void> => {
        return this.delete(this.orgUrl([orgId]));
    };

    /* Organization Users */
    getOrganizationRoles = (): Observable<OrganizationRole[]> => {
        return this.get('/organization_roles');
    };

    getOrganizationUsers = (orgId: Id): Observable<OrganizationUser[]> => {
        return this.get(this.orgUrl([orgId, 'users']));
    };

    createOrganizationUser = (
        orgId: Id,
        body: CreateOrganizationUser,
    ): Observable<OrganizationUser> => {
        return this.post(this.orgUrl([orgId, 'users']), { body });
    };

    updateOrganizationUser = (
        orgId: Id,
        body: UpdateOrganizationUser,
    ): Observable<OrganizationUser> => {
        return this.post(this.orgUrl([orgId, 'users']), { body });
    };

    getOrganizationUser = (orgId: Id, userId: Id): Observable<OrganizationUser> => {
        return this.get(this.orgUrl([orgId, 'users', userId]));
    };

    deleteOrganizationUser = (orgId: Id, userId: Id): Observable<void> => {
        return this.delete(this.orgUrl([orgId, 'users', userId]));
    };

    /* Systems */

    /* Internal */
}
