import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map, Observable, switchMap } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

interface ChannelPartnerUserExt extends ChannelPartnerUser {
    fullName: string;
    accessLevel: string[];
}

@Component({
    selector: 'nx-channel-partner-users',
    templateUrl: 'channel-partner-users.component.html',
    styleUrls: [
        'channel-partner-users.component.scss',
        '../../../components/groups-cards/groups-cards.component.scss',
    ],
})
export class NxChannelPartnerUsersComponent implements OnInit {
    LANG = staticLang;

    currentPartnerId$: Observable<string>;
    headers: Record<string, Record<string, number | string>>;
    records$: Observable<ChannelPartnerUserExt[]>;

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private route: ActivatedRoute,
    ) {
        this.currentPartnerId$ = this.route.parent.params.pipe(
            map(({ id }) => id),
            distinctUntilChanged(),
        );

        this.records$ = this.currentPartnerId$.pipe(
            switchMap(id => {
                return this.CPService.getChannelPartnerUsers(id);
            }),
            map(users =>
                users.map((user: ChannelPartnerUserExt): ChannelPartnerUserExt => {
                    user.fullName = 'N/A';
                    user.accessLevel = ['N/A'];
                    return user;
                }),
            ),
        );
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

    newUserDialog(partnerId: string): void {
        this.dialogsService.addPartnerUser(partnerId);
    }
}
