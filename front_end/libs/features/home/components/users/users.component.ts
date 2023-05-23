import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentOrgId,
    selectCurrentPartnerId,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

interface ChannelPartnerUserExt extends ChannelPartnerUser {
    fullName: string;
    accessLevel: string[];
}

@Component({
    selector: 'nx-organization-users',
    templateUrl: 'users.component.html',
    styleUrls: [
        'users.component.scss',
        '../../components/groups-cards/groups-cards.component.scss',
    ],
})
export class NxOrganizationUsersComponent implements OnInit {
    LANG = staticLang;

    currentPartnerId: string;
    headers: Record<string, Record<string, number | string>>;
    records: ChannelPartnerUserExt[];

    constructor(
        private cpService: NxChannelPartnersService,
        private store: Store,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
    ) {
        this.records = [];
        // Table only works for channelPartner users, need to add support for org users
        this.store
            .select(selectCurrentPartnerId)
            .pipe(take(1))
            .subscribe(id => {
                this.currentPartnerId = id;
                this.cpService.getChannelPartnerUsers(id).subscribe(users => {
                    /* current api payload
                     email: "rbarsegian@networkoptix.com"
                     roles: ["Administrator"]
                     userId: 12
                    */
                    this.records = users.map(
                        (user: ChannelPartnerUserExt): ChannelPartnerUserExt => {
                            user.fullName = 'N/A';
                            user.accessLevel = ['N/A'];
                            return user;
                        },
                    );
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

    newUserDialog(): void {
        this.route.parent.snapshot.data.inOrganization || this.route.snapshot.data.inOrganization
            ? this.store
                  .select(selectCurrentOrgId)
                  .pipe(take(1))
                  .subscribe(id => this.dialogsService.addOrgUser(id))
            : this.dialogsService.addPartnerUser(this.currentPartnerId);
    }
}
