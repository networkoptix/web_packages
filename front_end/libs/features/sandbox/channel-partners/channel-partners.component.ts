import { Component, OnInit } from '@angular/core';

import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';

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

    constructor(private cpService: NxChannelPartnersService) {}

    ngOnInit(): void {}
}
