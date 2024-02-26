import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import type { ChannelPartnersApi as CpApi } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api';
import type {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { memoizeAsyncShort } from '@utils/memoize';

@Injectable({
    providedIn: 'root',
})
export class NxChannelPartnersService {
    get cpApi(): CpApi {
        return this.cloudApi.cloudChannelPartnersApi;
    }

    constructor(
        private cloudApi: NxCloudApiService,
        private paramStateService: NxParamStateService,
    ) {}

    paramStateHandler = this.paramStateService.getStateHandler(({ params }) => ({
        params: {
            organizationId: params.organizationId,
            partnerId: params.partnerId,
            groupId: params.groupId,
            email: params.email,
            subchannelId: params.subchannelId,
        },
    }));

    /** Convert to promise to fire request without needing to subscribe */
    // private promisify<T, M extends (...args: Parameters<M>) => Observable<T>>(
    //     method: M,
    // ): (...args: Parameters<M>) => Promise<T> {
    //     return (...args) => {
    //         return firstValueFrom(method(...args));
    //     };
    // }

    /* Channel Partners */
    @memoizeAsyncShort
    getChannelPartners(): Observable<ChannelPartner[]> {
        return this.cpApi.getChannelPartners();
    }
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
    getSelfChannelPartnerUser = this.cpApi.getSelfChannelPartnerUser;

    /* Organizations */
    getPartnerOrganizations = this.cpApi.getPartnerOrganizations;
    @memoizeAsyncShort
    getOrganizations(includeChildOrgs = false): Observable<Organization[]> {
        return this.cpApi.getOrganizations(includeChildOrgs);
    }
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
    deleteBulkOrganizationUsers = this.cpApi.deleteBulkOrganizationUsers;

    /* Systems */
    getUserSystems = this.cpApi.getUserSystems;
    patchSystem = this.cpApi.patchSystem;
    getOrgSystems = this.cpApi.getOrgSystems;
    transferSystemToOrg = this.cpApi.transferSystemToOrg;
    updateSystemGroup = this.cpApi.updateSystemGroup;

    /* Groups */
    getOrgGroups = this.cpApi.getOrgGroups;
    createGroup = this.cpApi.createGroup;
    getGroup = this.cpApi.getGroup;
    patchGroup = this.cpApi.patchGroup;
    deleteGroup = this.cpApi.deleteGroup;

    /* Group Users */
    getGroupUser = this.cpApi.getGroupUser;
    getGroupUsers = this.cpApi.getGroupUsers;
    getGroupUsersWithAccess = this.cpApi.getGroupUsersWithAccess;
    updateGroupUser = this.cpApi.updateGroupUser;
    deleteBulkGroupUsers = this.cpApi.deleteBulkGroupUsers;
}
