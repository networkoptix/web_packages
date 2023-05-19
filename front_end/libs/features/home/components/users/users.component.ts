import { Component, OnInit } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

interface ChannelPartnerUserExt extends ChannelPartnerUser {
    fullName: string;
    accessLevel: string[];
}

@Component({
    selector: 'nx-organization-users',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss'],
})
export class NxOrganizationUsersComponent implements OnInit {
    LANG = staticLang;

    // Temporary Nx CP Id
    currentPartnerId: string = '5f124fdd-9fc7-43c1-898a-0dabde021894';
    headers: Record<string, Record<string, number | string>>;
    records: ChannelPartnerUserExt[];

    constructor(private cpService: NxChannelPartnersService) {
        this.records = [];
        // Table only works for channelPartner users, need to add support for org users
        this.cpService.getChannelPartnerUsers(this.currentPartnerId).subscribe(users => {
            /* current api payload
                email: "rbarsegian@networkoptix.com"
                roles: ["Administrator"]
                userId: 12
            */
            this.records = users.map((user: ChannelPartnerUserExt): ChannelPartnerUserExt => {
                user.fullName = 'N/A';
                user.accessLevel = ['N/A'];
                return user;
            });
        });
    }

    ngOnInit(): void {
        this.headers = {
            email: {
                name: this.LANG.channelPartners.usersTableHeaders.login,
            },
            fullName: {
                name: this.LANG.channelPartners.usersTableHeaders.fullName,
            },
            accessLevel: {
                name: this.LANG.channelPartners.usersTableHeaders.accessLevel,
            },
            roles: {
                name: this.LANG.channelPartners.usersTableHeaders.groups,
            },
        };
    }
}
