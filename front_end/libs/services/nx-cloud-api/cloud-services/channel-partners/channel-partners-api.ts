import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    BrandInfo,
    OrganizationInfo,
    PartnerInfo,
    UserInfo,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { WithFreshSession } from '../../nx-cloud-api.types';
import {
    BaseCloudServiceAPI,
    CreateApiFactory,
    implementsCloudServiceApi,
} from '../base-cloud-service-api';

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
    static createApiFactory: CreateApiFactory<ChannelPartnersApi> = (http: HttpClient, withFreshSession: WithFreshSession) => (serverUrl: string, cloudHost: () => string) => {
        ChannelPartnersApi.INSTANCES[serverUrl] ||= new ChannelPartnersApi(serverUrl, cloudHost, http, withFreshSession);
        return ChannelPartnersApi.INSTANCES[serverUrl];
    };

    constructor(
        serverUrl: string,
        cloudHost: () => string,
        http: HttpClient,
        withFreshSession: WithFreshSession
    ) {
        super(
            serverUrl,
            ChannelPartnersApi.API_BASE,
            cloudHost,
            http,
            withFreshSession
        );
    }

    public getCustomisations(): Observable<BrandInfo[]> {
        return this.get('/customizations/');
    }

    public addCustomization(body: BrandInfo): Observable<BrandInfo> {
        return this.post('/customizations/', { body });
    }

    public getPartners(customizationId: number): Observable<PartnerInfo[]> {
        return this.get(`/customizations/${customizationId}/channel_partners/`);
    }

    public addCustomizationPartner(customizationId: number, body: PartnerInfo): Observable<PartnerInfo> {
        return this.post(`/customizations/${customizationId}/channel_partners/`, { body });
    }

    public getOrganizations(customizationId: number, partner: PartnerInfo): Observable<OrganizationInfo[]> {
        return this.get(`/customizations/${customizationId}/channel_partners/${partner.id}/organizations/`);
    }

    public getUsers(customizationId: number): Observable<UserInfo[]> {
        return this.get(`/customizations/${customizationId}/users/`);
    }

    public addCustomizationUser(customizationId: number, body: UserInfo): Observable<UserInfo> {
        return this.post(`/customizations/${customizationId}/users/`, { body });
    }
}
