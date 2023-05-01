import { Injectable } from '@angular/core';
// import { firstValueFrom, Observable } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import type { ChannelPartnersApi as CpApi } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api';

@Injectable({
    providedIn: 'root',
})
export class NxChannelPartnersService {
    get cpApi(): CpApi {
        return this.cloudApi.cloudChannelPartnersApi;
    }

    constructor(private cloudApi: NxCloudApiService) {}

    /** Convert to promise to fire request without needing to subscribe */
    // private promisify<T, M extends (...args: Parameters<M>) => Observable<T>>(
    //     method: M,
    // ): (...args: Parameters<M>) => Promise<T> {
    //     return (...args) => {
    //         return firstValueFrom(method(...args));
    //     };
    // }

    /* Channel Partners */
    getChannelPartners = this.cpApi.getChannelPartners;
    createChannelPartner = this.cpApi.createChannelPartner;
    getSubChannelPartners = this.cpApi.getSubChannelPartners;
    getChannelPartner = this.cpApi.getChannelPartner;
    updateChannelPartner = this.cpApi.updateChannelPartner;
    removeChannelPartner = this.cpApi.removeChannelPartner;

    /* Channel Partner Users */
    getChannelPartnerRoles = this.cpApi.getChannelPartnerRoles;
    getChannelPartnerUsers = this.cpApi.getChannelPartnerUsers;
    createChannelPartnerUser = this.cpApi.createChannelPartnerUser;
    updateChannelPartnerUser = this.cpApi.updateChannelPartnerUser;
    getChannelPartnerUser = this.cpApi.getChannelPartnerUser;
    deleteChannelPartnerUser = this.cpApi.deleteChannelPartnerUser;

    /* Organizations */
    getPartnerOrganizations = this.cpApi.getPartnerOrganizations;
    getOrganizations = this.cpApi.getOrganizations;
    createOrganization = this.cpApi.createOrganization;
    getOrganization = this.cpApi.getOrganization;
    updateOrganization = this.cpApi.updateOrganization;
    removeOrganization = this.cpApi.removeOrganization;

    /* Organization Users */
    getOrganizationRoles = this.cpApi.getOrganizationRoles;
    getOrganizationUsers = this.cpApi.getOrganizationUsers;
    createOrganizationUser = this.cpApi.createOrganizationUser;
    updateOrganizationUser = this.cpApi.updateOrganizationUser;
    getOrganizationUser = this.cpApi.getOrganizationUser;
    deleteOrganizationUser = this.cpApi.deleteOrganizationUser;
}
