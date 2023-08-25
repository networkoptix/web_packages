import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { distinctUntilChanged, map, Observable, switchMap } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';

import { NxUsersTableComponent } from '../../users-table/users-table.component';

import type { OrgUserExt } from './org-users.types';

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
    headers: HEADER_ITEM[];
    records$: Observable<OrgUserExt[]>;

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
                users.map(user => ({
                    ...user,
                    userId: user.email,
                    fullName: 'N/A',
                    accessLevel: ['N/A'],
                })),
            ),
        );
        this.headers = [
            {
                name: 'email',
                value: this.LANG.channelPartners.usersTableHeaders.login,
                sort: 'string',
            },
            {
                name: 'fullName',
                value: this.LANG.channelPartners.usersTableHeaders.fullName,
                sort: 'string',
            },
            { name: 'accessLevel', value: this.LANG.channelPartners.usersTableHeaders.accessLevel },
            { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
        ];
    }

    newUserDialog(orgId: string): void {
        this.dialogsService.addOrgUser(orgId);
    }
}
