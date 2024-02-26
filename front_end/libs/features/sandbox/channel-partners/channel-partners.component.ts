import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PushPipe } from '@ngrx/component';

import { NxChannelPartnersService } from '@services/channel-partners.service';

@Component({
    selector: 'nx-channel-partners',
    templateUrl: 'channel-partners.component.html',
    styleUrls: ['channel-partners.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, PushPipe],
})
export class NxChannelPartnersComponent implements OnInit {
    channelParters$ = this.cpService.getChannelPartners();
    channelPartnerRoles$ = this.cpService.getChannelPartnerRoles();
    organizations$ = this.cpService.getOrganizations();
    organizationRoles$ = this.cpService.getOrganizationRoles();

    constructor(private cpService: NxChannelPartnersService) {}

    ngOnInit(): void {}
}
