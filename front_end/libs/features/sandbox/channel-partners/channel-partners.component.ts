import { Component, OnInit } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
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

    constructor(private cpService: NxChannelPartnersService, dialogs: NxDialogsService) {}

    ngOnInit(): void {
        // this.cpService.getPartnerOrganizations(4).subscribe(console.log);
        // this.cpService.getChannelPartnerUsers(7).subscribe(console.log);
        // this.cpService.getOrganization(4).subscribe(console.log);
        /* eslint-disable prettier/prettier */
        // this.cpService
        //     .getOrganization
        //     (5).subscribe(console.log);
        /* eslint-enable prettier/prettier */
    }

    // newChannelPartner(): void {
    //     this.dialogs.addBrandUser();
    //     this.cpService.createChannelPartner({
    //         name: 'myNewChannel2',
    //         parentChannelPartner: 4,
    //     });
    //     .subscribe(res => {
    //         console.log(res);
    //     });
    // }

    // createOrganization(partnerId?: Id): void {
    //     this.dialogs.addBrandPartner();
    // }
}
