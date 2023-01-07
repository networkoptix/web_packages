/** This should be refactored to not be its own service */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    BrandInfo, OrganizationInfo, PartnerInfo,
    UserInfo
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Injectable({
    providedIn: 'root'
})
export class NxPartnersService implements OnDestroy {
    customizationsSubject = new BehaviorSubject<BrandInfo[]>([]);
    currentCustomization:BrandInfo;
    usersSubject = new BehaviorSubject<UserInfo[]>([]);
    partnersSubject = new BehaviorSubject<PartnerInfo[]>([]);
    organizationsSubject = new BehaviorSubject<OrganizationInfo[]>([]);

    constructor(
        private cloudApi: NxCloudApiService,
    ) {}

    private addTo(
        subject: BehaviorSubject<unknown[]>,
        toAdd: unknown
    ): void {
        const values = subject.getValue();
        values.push(toAdd);
        subject.next(values);
    }

    loadCustomizations(): void {
        this.cloudApi.cloudChannelPartnersApi
            .getCustomisations().toPromise()
            .then(customizations => {
                this.customizationsSubject.next(customizations);
            });
    }

    getCustomization(id: number): BrandInfo {
        const channels = this.customizationsSubject.getValue();
        this.currentCustomization = channels.find(channel => channel.id === id);
        return this.currentCustomization;
    }

    addBrand(customization: BrandInfo): void {
        this.cloudApi.cloudChannelPartnersApi
            .addCustomization(customization).toPromise()
            .then((response: BrandInfo) => {
                this.addTo(this.customizationsSubject, response);
            });
    }

    getPartner(id: number): PartnerInfo {
        return this.partnersSubject.value.find(partner => partner.id === id);
    }

    getPartners(): void {
        this.cloudApi.cloudChannelPartnersApi
            .getPartners(this.currentCustomization.id).toPromise()
            .then((response: PartnerInfo[]) => {
                this.partnersSubject.next(response);
            });
    }

    addPartner(partner: PartnerInfo): void {
        this.cloudApi.cloudChannelPartnersApi
            .addCustomizationPartner(this.currentCustomization.id, partner).toPromise()
            .then((response: PartnerInfo) => {
                this.addTo(this.partnersSubject, response);
            });
    }

    getOrganizations(partner: PartnerInfo): void {
        const customizationId = this.currentCustomization?.id || partner.customization;
        this.cloudApi.cloudChannelPartnersApi
            .getOrganizations(customizationId, partner).toPromise()
            .then((response: OrganizationInfo[]) => {
                this.organizationsSubject.next(response);
            });
    }

    getOrganization(id: number): OrganizationInfo {
        return this.organizationsSubject.value.find(organization => organization.id === id);
    }

    getUsers(): void {
        this.cloudApi.cloudChannelPartnersApi
            .getUsers(this.currentCustomization.id).toPromise()
            .then((response: UserInfo[]) => {
                this.usersSubject.next(response);
            });
    }

    addUser(user: UserInfo): void {
        this.cloudApi.cloudChannelPartnersApi
            .addCustomizationUser(this.currentCustomization.id, user).toPromise()
            .then((response: UserInfo) => {
                this.addTo(this.usersSubject, response);
            });
    }

    ngOnDestroy(): void {
        this.customizationsSubject.complete();
    }
}
