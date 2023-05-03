import { Component, OnInit } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import type { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
// import type { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-channel-partners',
    templateUrl: 'channel-partners.component.html',
    styleUrls: ['channel-partners.component.scss'],
})
export class NxChannelPartnersComponent implements OnInit {
    channelParters$ = this.cpService.getChannelPartners();
    channelPartnerRoles$ = this.cpService.getChannelPartnerRoles();
    organizations$ = this.cpService.getOrganizations();
    organizationRoles$ = this.cpService.getOrganizationRoles();

    constructor(private cpService: NxChannelPartnersService, private dialogs: NxDialogsService) {}

    ngOnInit(): void {
        // this.cpService.getPartnerOrganizations(4).subscribe(console.log);
        // this.cpService.getChannelPartnerUsers(7).subscribe(console.log);
        // this.cpService.getOrganization(4).subscribe(console.log);
        /* eslint-disable prettier/prettier */
        this.cpService
            .createChannelPartnerUser
            (11, { email: 'awu@networkoptix.com', role: 'Administrator'})
            .subscribe(console.log);
        /* eslint-enable prettier/prettier */
    }

    newChannelPartner(parentChannelPartner: Id): void {
        this.dialogs.createChannelPartner(parentChannelPartner);
    }

    // createOrganization(partnerId?: Id): void {
    //     this.dialogs.addBrandPartner();
    // }
}
