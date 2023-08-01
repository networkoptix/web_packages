import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { distinctUntilChanged, map, Observable, switchMap } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxUsersTableComponent } from '../../users-table/users-table.component';

interface ChannelPartnerUserExt extends ChannelPartnerUser {
    fullName: string;
    accessLevel: string[];
}

@Component({
    selector: 'nx-org-users',
    templateUrl: 'org-users.component.html',
    styleUrls: [
        'org-users.component.scss',
        '../../../components/groups-cards/groups-cards.component.scss',
    ],
    standalone: true,
    imports: [AsyncPipe, NxUsersTableComponent, TranslateModule],
})
export class NxOrganizationUsersComponent implements OnInit {
    LANG = staticLang;

    currentOrgId$: Observable<string>;
    headers: Record<string, Record<string, number | string>>;
    records$: Observable<ChannelPartnerUserExt[]>;

    constructor(
        private route: ActivatedRoute,
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {}

    ngOnInit(): void {
        this.currentOrgId$ = this.route.parent.params.pipe(
            map(({ id }) => id),
            distinctUntilChanged(),
        );
        this.records$ = this.currentOrgId$.pipe(
            switchMap(id => this.CPService.getOrganizationUsers(id)),
            map(users =>
                users.map((user: ChannelPartnerUserExt): ChannelPartnerUserExt => {
                    user.fullName = 'N/A';
                    user.accessLevel = ['N/A'];
                    return user;
                }),
            ),
        );
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

    newUserDialog(orgId: string): void {
        this.dialogsService.addOrgUser(orgId);
    }
}
